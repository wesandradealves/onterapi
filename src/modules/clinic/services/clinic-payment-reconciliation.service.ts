import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  ClinicInvitationEconomicSummary,
  ClinicPaymentLedger,
  ClinicPaymentLedgerChargeback,
  ClinicPaymentLedgerEventEntry,
  ClinicPaymentLedgerRefund,
  ClinicPaymentLedgerSettlement,
  ClinicPaymentSettings,
  ClinicPaymentSplitAllocation,
  ClinicSplitRecipient,
} from '../../../domain/clinic/types/clinic.types';
import {
  IClinicAppointmentRepository,
  IClinicAppointmentRepository as IClinicAppointmentRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-appointment.repository.interface';
import {
  IClinicConfigurationRepository,
  IClinicConfigurationRepository as IClinicConfigurationRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-configuration.repository.interface';
import { ClinicAuditService } from '../../../infrastructure/clinic/services/clinic-audit.service';
import { parseClinicPaymentSettings } from '../utils/payment-settings.parser';
import { extractClinicPaymentLedger } from '../utils/clinic-payment-ledger.util';
import { extractAppointmentCoverageContext } from '../utils/clinic-appointment-metadata.util';
import {
  ClinicPaymentChargebackEvent,
  ClinicPaymentFailedEvent,
  ClinicPaymentRefundedEvent,
  ClinicPaymentSettledEvent,
  ClinicPaymentStatusChangedEvent,
} from './clinic-payment-event.types';
import { ClinicPaymentNotificationService } from './clinic-payment-notification.service';
import { ClinicPaymentPayoutService } from './clinic-payment-payout.service';

interface PaymentSplitComputation {
  allocations: ClinicPaymentSplitAllocation[];
  remainderCents: number;
}

type ClinicInvitationEconomicSummaryItem = ClinicInvitationEconomicSummary['items'][number];

interface ProfessionalPolicySnapshot {
  policyId?: string;
  channelScope?: string;
  sourceInvitationId?: string;
  economicSummary: ClinicInvitationEconomicSummary;
}

@Injectable()
export class ClinicPaymentReconciliationService {
  private readonly logger = new Logger(ClinicPaymentReconciliationService.name);

  constructor(
    @Inject(IClinicAppointmentRepositoryToken)
    private readonly appointmentRepository: IClinicAppointmentRepository,
    @Inject(IClinicConfigurationRepositoryToken)
    private readonly clinicConfigurationRepository: IClinicConfigurationRepository,
    private readonly auditService: ClinicAuditService,
    private readonly paymentNotificationService: ClinicPaymentNotificationService,
    private readonly paymentPayoutService: ClinicPaymentPayoutService,
  ) {}

  async handleStatusChanged(event: ClinicPaymentStatusChangedEvent): Promise<void> {
    const appointment = await this.appointmentRepository.findById(event.payload.appointmentId);

    if (!appointment) {
      this.logger.warn('Evento de pagamento sem agendamento correspondente', {
        type: 'status_changed',
        appointmentId: event.payload.appointmentId,
      });
      return;
    }

    const ledger = extractClinicPaymentLedger(appointment.metadata);

    if (
      event.payload.fingerprint &&
      this.hasEvent(ledger, 'status_changed', event.payload.fingerprint)
    ) {
      this.logger.log('Evento de status de pagamento ignorado (duplicado)', {
        appointmentId: appointment.id,
        fingerprint: event.payload.fingerprint,
      });
      return;
    }

    const recordedAt = (event.payload.processedAt ?? new Date()).toISOString();

    const nextLedger = this.appendEvent(ledger, {
      type: 'status_changed',
      gatewayStatus: event.payload.gatewayStatus,
      eventType: event.payload.eventType,
      recordedAt,
      fingerprint: event.payload.fingerprint,
      sandbox: event.payload.sandbox,
      metadata: {
        previousStatus: event.payload.previousStatus,
        newStatus: event.payload.newStatus,
        payloadId: event.payload.payloadId ?? null,
      },
    });

    await this.persistLedger(appointment.id, nextLedger);

    await this.auditService.register({
      event: 'clinic.payment.status_changed_recorded',
      tenantId: appointment.tenantId,
      clinicId: appointment.clinicId,
      detail: {
        appointmentId: appointment.id,
        paymentTransactionId: event.payload.paymentTransactionId,
        previousStatus: event.payload.previousStatus,
        newStatus: event.payload.newStatus,
        gatewayStatus: event.payload.gatewayStatus,
        sandbox: event.payload.sandbox,
        fingerprint: event.payload.fingerprint ?? null,
        processedAt: recordedAt,
      },
    });
  }

  async handlePaymentSettled(event: ClinicPaymentSettledEvent): Promise<void> {
    await this.recordSettlement(event);
  }

  async handlePaymentRefunded(event: ClinicPaymentRefundedEvent): Promise<void> {
    await this.recordRefund(event);
  }

  async handlePaymentChargeback(event: ClinicPaymentChargebackEvent): Promise<void> {
    await this.recordChargeback(event);
  }

  async handlePaymentFailed(event: ClinicPaymentFailedEvent): Promise<void> {
    await this.recordFailure(event);
  }

  private async recordSettlement(event: ClinicPaymentSettledEvent): Promise<void> {
    const appointment = await this.appointmentRepository.findById(event.payload.appointmentId);

    if (!appointment) {
      this.logger.warn('Liquidacao de pagamento ignorada: agendamento inexistente', {
        appointmentId: event.payload.appointmentId,
      });
      return;
    }

    const ledger = extractClinicPaymentLedger(appointment.metadata);

    if (event.payload.fingerprint && this.hasEvent(ledger, 'settled', event.payload.fingerprint)) {
      this.logger.log('Liquidacao de pagamento ignorada (evento duplicado)', {
        appointmentId: appointment.id,
        fingerprint: event.payload.fingerprint,
      });
      return;
    }

    const professionalPolicySnapshot = this.extractProfessionalPolicyMetadata(
      appointment.metadata as Record<string, unknown> | undefined,
    );

    if (
      professionalPolicySnapshot &&
      !professionalPolicySnapshot.economicSummary.items.some(
        (item) => item.serviceTypeId === appointment.serviceTypeId,
      )
    ) {
      this.logger.warn(
        'Politica clinica-profissional nao contempla o tipo de servico liquidado; aplicando split financeiro geral',
        {
          appointmentId: appointment.id,
          policyId: professionalPolicySnapshot.policyId ?? null,
          serviceTypeId: appointment.serviceTypeId,
        },
      );
    }

    const paymentSettings = await this.resolvePaymentSettings(appointment.clinicId);
    const baseAmount = this.resolveAmountValue(event.payload.amount, appointment.metadata, 'value');

    if (baseAmount == null) {
      this.logger.error('Liquidacao sem valor bruto identificado', {
        appointmentId: appointment.id,
        paymentTransactionId: event.payload.paymentTransactionId,
      });
      return;
    }

    const baseCents = this.toCents(baseAmount);
    const netAmount = this.resolveAmountValue(
      event.payload.amount,
      appointment.metadata,
      'netValue',
    );
    const netCents = netAmount != null ? this.toCents(netAmount) : undefined;

    const computation = this.calculateSplit(baseCents, paymentSettings, {
      policySummary: professionalPolicySnapshot?.economicSummary,
      serviceTypeId: appointment.serviceTypeId,
    });
    const settledAtIso = event.payload.settledAt.toISOString();
    const recordedAt = (event.payload.processedAt ?? new Date()).toISOString();

    const settlement: ClinicPaymentLedgerSettlement = {
      settledAt: settledAtIso,
      baseAmountCents: baseCents,
      netAmountCents: netCents,
      split: computation.allocations,
      remainderCents: computation.remainderCents,
      fingerprint: event.payload.fingerprint,
      gatewayStatus: event.payload.gatewayStatus,
    };

    const nextLedger = this.appendEvent(
      {
        ...ledger,
        settlement,
      },
      {
        type: 'settled',
        gatewayStatus: event.payload.gatewayStatus,
        eventType: event.payload.eventType,
        recordedAt,
        fingerprint: event.payload.fingerprint,
        sandbox: event.payload.sandbox,
        metadata: {
          payloadId: event.payload.payloadId ?? null,
          settledAt: settledAtIso,
        },
      },
    );

    await this.persistLedger(appointment.id, nextLedger);

    const { originalProfessionalId, coverageId } = extractAppointmentCoverageContext(appointment);

    await this.auditService.register({
      event: 'clinic.payment.settlement_recorded',
      tenantId: appointment.tenantId,
      clinicId: appointment.clinicId,
      detail: {
        appointmentId: appointment.id,
        paymentTransactionId: event.payload.paymentTransactionId,
        gatewayStatus: event.payload.gatewayStatus,
        fingerprint: event.payload.fingerprint ?? null,
        baseAmountCents: baseCents,
        netAmountCents: netCents ?? null,
        remainderCents: computation.remainderCents,
        split: computation.allocations,
        settledAt: settledAtIso,
        sandbox: event.payload.sandbox,
        professionalPolicyId: professionalPolicySnapshot?.policyId ?? null,
        policyChannelScope: professionalPolicySnapshot?.channelScope ?? null,
      },
    });

    await this.paymentPayoutService.requestPayout({
      appointmentId: appointment.id,
      tenantId: appointment.tenantId,
      clinicId: appointment.clinicId,
      professionalId: appointment.professionalId,
      originalProfessionalId,
      coverageId,
      patientId: appointment.patientId,
      holdId: appointment.holdId,
      serviceTypeId: appointment.serviceTypeId,
      paymentTransactionId: event.payload.paymentTransactionId,
      provider: paymentSettings.provider,
      credentialsId: paymentSettings.credentialsId,
      sandboxMode: paymentSettings.sandboxMode,
      bankAccountId: paymentSettings.bankAccountId,
      settlement: {
        settledAt: event.payload.settledAt,
        baseAmountCents: baseCents,
        netAmountCents: netCents ?? null,
        split: computation.allocations,
        remainderCents: computation.remainderCents,
      },
      currency: ledger.currency,
      gateway: {
        status: event.payload.gatewayStatus,
        eventType: event.payload.eventType,
        fingerprint: event.payload.fingerprint,
        payloadId: event.payload.payloadId,
        sandbox: event.payload.sandbox,
      },
    });

    await this.paymentNotificationService.notifySettlement({
      appointment,
      event,
      settlement,
    });
  }

  private async recordRefund(event: ClinicPaymentRefundedEvent): Promise<void> {
    const appointment = await this.appointmentRepository.findById(event.payload.appointmentId);

    if (!appointment) {
      this.logger.warn('Reembolso de pagamento ignorado: agendamento inexistente', {
        appointmentId: event.payload.appointmentId,
      });
      return;
    }

    const ledger = extractClinicPaymentLedger(appointment.metadata);

    if (event.payload.fingerprint && this.hasEvent(ledger, 'refunded', event.payload.fingerprint)) {
      this.logger.log('Reembolso de pagamento ignorado (evento duplicado)', {
        appointmentId: appointment.id,
        fingerprint: event.payload.fingerprint,
      });
      return;
    }

    const refundedAtIso = event.payload.refundedAt.toISOString();
    const recordedAt = (event.payload.processedAt ?? new Date()).toISOString();
    const amount = this.resolveAmountValue(event.payload.amount, appointment.metadata, 'value');
    const netAmount = this.resolveAmountValue(
      event.payload.amount,
      appointment.metadata,
      'netValue',
    );

    const refund: ClinicPaymentLedgerRefund = {
      refundedAt: refundedAtIso,
      amountCents: amount != null ? this.toCents(amount) : undefined,
      netAmountCents: netAmount != null ? this.toCents(netAmount) : undefined,
      gatewayStatus: event.payload.gatewayStatus,
      fingerprint: event.payload.fingerprint,
    };

    const nextLedger = this.appendEvent(
      { ...ledger, refund },
      {
        type: 'refunded',
        gatewayStatus: event.payload.gatewayStatus,
        eventType: event.payload.eventType,
        recordedAt,
        fingerprint: event.payload.fingerprint,
        sandbox: event.payload.sandbox,
        metadata: {
          payloadId: event.payload.payloadId ?? null,
          refundedAt: refundedAtIso,
        },
      },
    );

    await this.persistLedger(appointment.id, nextLedger);

    await this.auditService.register({
      event: 'clinic.payment.refund_recorded',
      tenantId: appointment.tenantId,
      clinicId: appointment.clinicId,
      detail: {
        appointmentId: appointment.id,
        paymentTransactionId: event.payload.paymentTransactionId,
        gatewayStatus: event.payload.gatewayStatus,
        fingerprint: event.payload.fingerprint ?? null,
        refundedAt: refundedAtIso,
        amountCents: refund.amountCents ?? null,
        netAmountCents: refund.netAmountCents ?? null,
        sandbox: event.payload.sandbox,
      },
    });

    await this.paymentNotificationService.notifyRefund({
      appointment,
      event,
      refund,
    });
  }

  private async recordChargeback(event: ClinicPaymentChargebackEvent): Promise<void> {
    const appointment = await this.appointmentRepository.findById(event.payload.appointmentId);

    if (!appointment) {
      this.logger.warn('Chargeback ignorado: agendamento inexistente', {
        appointmentId: event.payload.appointmentId,
      });
      return;
    }

    const ledger = extractClinicPaymentLedger(appointment.metadata);

    if (
      event.payload.fingerprint &&
      this.hasEvent(ledger, 'chargeback', event.payload.fingerprint)
    ) {
      this.logger.log('Chargeback ignorado (evento duplicado)', {
        appointmentId: appointment.id,
        fingerprint: event.payload.fingerprint,
      });
      return;
    }

    const chargebackAtIso = event.payload.chargebackAt.toISOString();
    const recordedAt = (event.payload.processedAt ?? new Date()).toISOString();
    const amount = this.resolveAmountValue(event.payload.amount, appointment.metadata, 'value');
    const netAmount = this.resolveAmountValue(
      event.payload.amount,
      appointment.metadata,
      'netValue',
    );

    const chargeback: ClinicPaymentLedgerChargeback = {
      chargebackAt: chargebackAtIso,
      amountCents: amount != null ? this.toCents(amount) : undefined,
      netAmountCents: netAmount != null ? this.toCents(netAmount) : undefined,
      fingerprint: event.payload.fingerprint,
      gatewayStatus: event.payload.gatewayStatus,
    };

    const nextLedger = this.appendEvent(
      { ...ledger, chargeback },
      {
        type: 'chargeback',
        gatewayStatus: event.payload.gatewayStatus,
        eventType: event.payload.eventType,
        recordedAt,
        fingerprint: event.payload.fingerprint,
        sandbox: event.payload.sandbox,
        metadata: {
          payloadId: event.payload.payloadId ?? null,
          chargebackAt: chargebackAtIso,
        },
      },
    );

    await this.persistLedger(appointment.id, nextLedger);

    await this.auditService.register({
      event: 'clinic.payment.chargeback_recorded',
      tenantId: appointment.tenantId,
      clinicId: appointment.clinicId,
      detail: {
        appointmentId: appointment.id,
        paymentTransactionId: event.payload.paymentTransactionId,
        gatewayStatus: event.payload.gatewayStatus,
        fingerprint: event.payload.fingerprint ?? null,
        chargebackAt: chargebackAtIso,
        amountCents: chargeback.amountCents ?? null,
        netAmountCents: chargeback.netAmountCents ?? null,
        sandbox: event.payload.sandbox,
      },
    });

    await this.paymentNotificationService.notifyChargeback({
      appointment,
      event,
      chargeback,
    });
  }

  private async recordFailure(event: ClinicPaymentFailedEvent): Promise<void> {
    const appointment = await this.appointmentRepository.findById(event.payload.appointmentId);

    if (!appointment) {
      this.logger.warn('Falha de pagamento ignorada: agendamento inexistente', {
        appointmentId: event.payload.appointmentId,
      });
      return;
    }

    const ledger = extractClinicPaymentLedger(appointment.metadata);

    if (event.payload.fingerprint && this.hasEvent(ledger, 'failed', event.payload.fingerprint)) {
      this.logger.log('Falha de pagamento ignorada (evento duplicado)', {
        appointmentId: appointment.id,
        fingerprint: event.payload.fingerprint,
      });
      return;
    }

    const recordedAt = (event.payload.processedAt ?? new Date()).toISOString();

    const nextLedger = this.appendEvent(ledger, {
      type: 'failed',
      gatewayStatus: event.payload.gatewayStatus,
      eventType: event.payload.eventType,
      recordedAt,
      fingerprint: event.payload.fingerprint,
      sandbox: event.payload.sandbox,
      metadata: {
        failedAt: event.payload.failedAt.toISOString(),
        reason: event.payload.reason ?? null,
        amount: event.payload.amount ?? null,
        payloadId: event.payload.payloadId ?? null,
      },
    });

    await this.persistLedger(appointment.id, nextLedger);

    await this.auditService.register({
      event: 'clinic.payment.failure_recorded',
      tenantId: appointment.tenantId,
      clinicId: appointment.clinicId,
      detail: {
        appointmentId: appointment.id,
        paymentTransactionId: event.payload.paymentTransactionId,
        gatewayStatus: event.payload.gatewayStatus,
        eventType: event.payload.eventType,
        sandbox: event.payload.sandbox,
        fingerprint: event.payload.fingerprint ?? null,
        reason: event.payload.reason ?? null,
        failedAt: event.payload.failedAt.toISOString(),
        processedAt: recordedAt,
      },
    });

    await this.paymentNotificationService.notifyFailure({
      appointment,
      event,
    });
  }

  private hasEvent(
    ledger: ClinicPaymentLedger,
    type: ClinicPaymentLedgerEventEntry['type'],
    fingerprint: string | undefined,
  ): boolean {
    if (!fingerprint) {
      return false;
    }

    return ledger.events.some((event) => event.type === type && event.fingerprint === fingerprint);
  }

  private appendEvent(
    ledger: ClinicPaymentLedger,
    entry: ClinicPaymentLedgerEventEntry,
  ): ClinicPaymentLedger {
    const nextEvents = [...ledger.events, entry];
    return {
      ...ledger,
      events: nextEvents,
      lastUpdatedAt: entry.recordedAt,
    };
  }

  private async persistLedger(appointmentId: string, ledger: ClinicPaymentLedger): Promise<void> {
    const plainLedger = JSON.parse(JSON.stringify(ledger));
    await this.appointmentRepository.updateMetadata({
      appointmentId,
      metadataPatch: {
        paymentLedger: plainLedger,
      },
    });
  }

  private async resolvePaymentSettings(clinicId: string): Promise<ClinicPaymentSettings> {
    const version = await this.clinicConfigurationRepository.findLatestAppliedVersion(
      clinicId,
      'payments',
    );

    if (!version) {
      throw new Error(`Configuracoes de pagamento nao encontradas para a clinica ${clinicId}`);
    }

    const rawPayload = version.payload ?? {};
    const source =
      typeof rawPayload === 'object' && rawPayload !== null && 'paymentSettings' in rawPayload
        ? (rawPayload as Record<string, unknown>).paymentSettings
        : rawPayload;

    return parseClinicPaymentSettings(source);
  }

  private resolveAmountValue(
    snapshot: { value?: number | null; netValue?: number | null } | undefined,
    metadata: Record<string, unknown> | undefined,
    field: 'value' | 'netValue',
  ): number | undefined {
    if (snapshot && typeof snapshot[field] === 'number') {
      return snapshot[field] ?? undefined;
    }

    const gatewayPayload =
      metadata &&
      typeof metadata === 'object' &&
      metadata !== null &&
      'paymentGateway' in metadata &&
      typeof (metadata as Record<string, unknown>).paymentGateway === 'object'
        ? ((metadata as Record<string, unknown>).paymentGateway as Record<string, unknown>)
        : undefined;

    const payload =
      gatewayPayload && typeof gatewayPayload.payload === 'object'
        ? (gatewayPayload.payload as Record<string, unknown>)
        : undefined;

    if (payload && typeof payload[field] === 'number') {
      return payload[field] as number;
    }

    return undefined;
  }

  private extractProfessionalPolicyMetadata(
    metadata: Record<string, unknown> | undefined,
  ): ProfessionalPolicySnapshot | null {
    if (!metadata || typeof metadata !== 'object') {
      return null;
    }

    const container = metadata as Record<string, unknown>;
    const rawPolicy = container.professionalPolicy as unknown;

    if (!rawPolicy || typeof rawPolicy !== 'object') {
      return null;
    }

    const snapshot = rawPolicy as Record<string, unknown>;
    const summary = snapshot.economicSummary;

    if (!summary || typeof summary !== 'object') {
      return null;
    }

    return {
      policyId: typeof snapshot.policyId === 'string' ? snapshot.policyId : undefined,
      channelScope: typeof snapshot.channelScope === 'string' ? snapshot.channelScope : undefined,
      sourceInvitationId:
        typeof snapshot.sourceInvitationId === 'string' ? snapshot.sourceInvitationId : undefined,
      economicSummary: summary as ClinicInvitationEconomicSummary,
    };
  }

  private calculateSplit(
    baseAmountCents: number,
    paymentSettings: ClinicPaymentSettings,
    context?: {
      policySummary?: ClinicInvitationEconomicSummary;
      serviceTypeId?: string;
    },
  ): PaymentSplitComputation {
    const rules =
      paymentSettings.splitRules.length > 0
        ? [...paymentSettings.splitRules]
        : [
            {
              recipient: 'clinic' as ClinicSplitRecipient,
              percentage: 100,
              order: 0,
            },
          ];

    rules.sort((a, b) => a.order - b.order);

    const baseAmount = baseAmountCents / 100;

    const allocations = rules.map((rule) => {
      const calculatedAmount = (baseAmount * rule.percentage) / 100;
      const amountCents = this.toCents(calculatedAmount);
      const allocation: ClinicPaymentSplitAllocation = {
        recipient: rule.recipient,
        percentage: rule.percentage,
        amountCents,
      };
      return allocation;
    });

    const policyItem =
      context?.policySummary && context.serviceTypeId
        ? context.policySummary.items.find((item) => item.serviceTypeId === context.serviceTypeId)
        : undefined;

    if (policyItem) {
      let professionalAmountCents = this.computeProfessionalAmount(baseAmount, policyItem);
      if (professionalAmountCents < 0) {
        professionalAmountCents = 0;
      }
      if (professionalAmountCents > baseAmountCents) {
        professionalAmountCents = baseAmountCents;
      }

      let professionalAllocation = allocations.find(
        (allocation) => allocation.recipient === 'professional',
      );

      if (!professionalAllocation) {
        professionalAllocation = {
          recipient: 'professional',
          percentage: 0,
          amountCents: professionalAmountCents,
        };
        allocations.push(professionalAllocation);
      } else {
        professionalAllocation.amountCents = professionalAmountCents;
      }

      const totalOtherPercentage = rules
        .filter((rule) => rule.recipient !== 'professional')
        .reduce((sum, rule) => sum + rule.percentage, 0);
      const remainingBaseCents = Math.max(baseAmountCents - professionalAllocation.amountCents, 0);
      const remainingBaseAmount = remainingBaseCents / 100;

      if (totalOtherPercentage > 0) {
        for (const rule of rules) {
          if (rule.recipient === 'professional') {
            continue;
          }

          const allocation = allocations.find((item) => item.recipient === rule.recipient);
          const computedAmount = this.toCents(
            remainingBaseAmount * (rule.percentage / totalOtherPercentage),
          );

          if (allocation) {
            allocation.amountCents = computedAmount;
          } else {
            allocations.push({
              recipient: rule.recipient,
              percentage: rule.percentage,
              amountCents: computedAmount,
            });
          }
        }
      } else {
        for (const allocation of allocations) {
          if (allocation.recipient !== 'professional') {
            allocation.amountCents = 0;
          }
        }
      }
    }

    let remainderCents =
      baseAmountCents - allocations.reduce((sum, allocation) => sum + allocation.amountCents, 0);

    const adjustmentOrder =
      context?.policySummary?.orderOfRemainders ??
      (['taxes', 'gateway', 'clinic', 'professional', 'platform'] as ClinicSplitRecipient[]);

    let safety = 0;
    while (remainderCents !== 0 && safety < 1000) {
      safety += 1;
      const targetRecipient = adjustmentOrder.find((recipient) =>
        allocations.some((allocation) => {
          if (allocation.recipient !== recipient) {
            return false;
          }

          if (remainderCents < 0) {
            return allocation.amountCents > 0;
          }

          return true;
        }),
      );

      if (!targetRecipient) {
        break;
      }

      const allocation = allocations.find((item) => item.recipient === targetRecipient);

      if (!allocation) {
        break;
      }

      if (remainderCents > 0) {
        allocation.amountCents += 1;
        remainderCents -= 1;
      } else if (remainderCents < 0) {
        if (allocation.amountCents > 0) {
          allocation.amountCents -= 1;
          remainderCents += 1;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    if (baseAmountCents > 0) {
      for (const allocation of allocations) {
        allocation.percentage = Number(
          ((allocation.amountCents / baseAmountCents) * 100).toFixed(6),
        );
      }
    } else {
      for (const allocation of allocations) {
        allocation.percentage = 0;
      }
    }

    return {
      allocations,
      remainderCents,
    };
  }

  private computeProfessionalAmount(
    baseAmount: number,
    item: ClinicInvitationEconomicSummaryItem,
  ): number {
    if (item.payoutModel === 'percentage') {
      const payoutAmount = baseAmount * (item.payoutValue / 100);
      return this.toCents(payoutAmount);
    }

    return this.toCents(item.payoutValue);
  }

  private toCents(amount: number): number {
    const rounded = this.roundHalfEven(amount, 2);
    return Math.round(rounded * 100);
  }

  private roundHalfEven(value: number, decimals = 2): number {
    if (!Number.isFinite(value)) {
      return value;
    }

    const factor = 10 ** decimals;
    const scaled = value * factor;
    if (scaled === 0) {
      return 0;
    }

    const sign = scaled < 0 ? -1 : 1;
    const absScaled = Math.abs(scaled);
    const floor = Math.floor(absScaled);
    const diff = absScaled - floor;
    const epsilon = 1e-10;

    if (diff > 0.5 + epsilon) {
      return ((floor + 1) * sign) / factor;
    }

    if (diff < 0.5 - epsilon) {
      return (floor * sign) / factor;
    }

    if (floor % 2 === 0) {
      return (floor * sign) / factor;
    }

    return ((floor + 1) * sign) / factor;
  }
}
