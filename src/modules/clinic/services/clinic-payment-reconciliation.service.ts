import { Inject, Injectable, Logger } from '@nestjs/common';

import {
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
import {
  ClinicPaymentChargebackEvent,
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

  private async recordSettlement(event: ClinicPaymentSettledEvent): Promise<void> {
    const appointment = await this.appointmentRepository.findById(event.payload.appointmentId);

    if (!appointment) {
      this.logger.warn('Liquidação de pagamento ignorada: agendamento inexistente', {
        appointmentId: event.payload.appointmentId,
      });
      return;
    }

    const ledger = extractClinicPaymentLedger(appointment.metadata);

    if (event.payload.fingerprint && this.hasEvent(ledger, 'settled', event.payload.fingerprint)) {
      this.logger.log('Liquidação de pagamento ignorada (evento duplicado)', {
        appointmentId: appointment.id,
        fingerprint: event.payload.fingerprint,
      });
      return;
    }

    const paymentSettings = await this.resolvePaymentSettings(appointment.clinicId);
    const baseAmount = this.resolveAmountValue(event.payload.amount, appointment.metadata, 'value');

    if (baseAmount == null) {
      this.logger.error('Liquidação sem valor bruto identificado', {
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

    const computation = this.calculateSplit(baseCents, paymentSettings);
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
      },
    });

    await this.paymentPayoutService.requestPayout({
      appointmentId: appointment.id,
      tenantId: appointment.tenantId,
      clinicId: appointment.clinicId,
      professionalId: appointment.professionalId,
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
      throw new Error(`Configurações de pagamento não encontradas para a clínica ${clinicId}`);
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

  private calculateSplit(
    baseAmountCents: number,
    paymentSettings: ClinicPaymentSettings,
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
    let allocatedCents = 0;

    const allocations = rules.map((rule) => {
      const calculatedAmount = (baseAmount * rule.percentage) / 100;
      const amountCents = this.toCents(calculatedAmount);
      allocatedCents += amountCents;
      const allocation: ClinicPaymentSplitAllocation = {
        recipient: rule.recipient,
        percentage: rule.percentage,
        amountCents,
      };
      return allocation;
    });

    let remainderCents = baseAmountCents - allocatedCents;
    const adjustmentOrder: ClinicSplitRecipient[] = [
      'taxes',
      'gateway',
      'clinic',
      'professional',
      'platform',
    ];

    let safety = 0;
    while (remainderCents !== 0 && safety < 1000) {
      safety += 1;
      const targetRecipient = adjustmentOrder.find((recipient) =>
        allocations.some((allocation) => allocation.recipient === recipient),
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
      } else if (remainderCents < 0 && allocation.amountCents > 0) {
        allocation.amountCents -= 1;
        remainderCents += 1;
      } else {
        break;
      }
    }

    return {
      allocations,
      remainderCents,
    };
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
