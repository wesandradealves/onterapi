import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import {
  type IClinicAppointmentRepository,
  IClinicAppointmentRepository as IClinicAppointmentRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-appointment.repository.interface';
import {
  type IClinicHoldRepository,
  IClinicHoldRepository as IClinicHoldRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-hold.repository.interface';
import {
  type IClinicPaymentWebhookEventRepository,
  IClinicPaymentWebhookEventRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-payment-webhook-event.repository.interface';
import {
  type IProcessClinicPaymentWebhookUseCase,
  IProcessClinicPaymentWebhookUseCase as IProcessClinicPaymentWebhookUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/process-clinic-payment-webhook.use-case.interface';
import {
  ClinicPaymentWebhookPayload,
  ProcessClinicPaymentWebhookInput,
} from '../../../domain/clinic/types/clinic.types';
import { ClinicAuditService } from '../../../infrastructure/clinic/services/clinic-audit.service';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';
import {
  mapAsaasEventToPaymentStatus,
  mapAsaasPaymentStatus,
} from '../utils/asaas-payment-status.mapper';

@Injectable()
export class ProcessClinicPaymentWebhookUseCase
  extends BaseUseCase<ProcessClinicPaymentWebhookInput, void>
  implements IProcessClinicPaymentWebhookUseCase
{
  private static readonly EVENT_TTL_DAYS = 180;

  protected readonly logger = new Logger(ProcessClinicPaymentWebhookUseCase.name);

  constructor(
    @Inject(IClinicAppointmentRepositoryToken)
    private readonly clinicAppointmentRepository: IClinicAppointmentRepository,
    @Inject(IClinicHoldRepositoryToken)
    private readonly clinicHoldRepository: IClinicHoldRepository,
    @Inject(IClinicPaymentWebhookEventRepositoryToken)
    private readonly webhookEventRepository: IClinicPaymentWebhookEventRepository,
    private readonly auditService: ClinicAuditService,
    private readonly messageBus: MessageBus,
  ) {
    super();
  }

  protected async handle(input: ProcessClinicPaymentWebhookInput): Promise<void> {
    if (input.provider !== 'asaas') {
      throw ClinicErrorFactory.paymentProviderNotSupported(
        'Webhook de pagamento nao suportado para o provedor informado',
      );
    }

    const paymentPayload = input.payload?.payment;
    if (!this.isValidPaymentPayload(paymentPayload)) {
      throw ClinicErrorFactory.paymentWebhookInvalid('Payload de pagamento ASAAS invalido');
    }

    const eventType = typeof input.payload.event === 'string' ? input.payload.event : undefined;
    const paymentId = paymentPayload.id.trim();
    const gatewayStatus = paymentPayload.status ?? eventType ?? 'UNKNOWN';
    const targetStatus =
      mapAsaasPaymentStatus(paymentPayload.status) ??
      mapAsaasEventToPaymentStatus(eventType, paymentPayload.status);

    if (!targetStatus) {
      this.logger.warn(`Webhook ASAAS ignorado: status desconhecido`, {
        paymentId,
        eventType,
        status: paymentPayload.status,
      });
      throw ClinicErrorFactory.paymentWebhookInvalid('Status de pagamento ASAAS nao reconhecido');
    }

    const appointment =
      await this.clinicAppointmentRepository.findByPaymentTransactionId(paymentId);

    if (!appointment) {
      this.logger.warn(`Webhook ASAAS sem agendamento correspondente`, { paymentId });
      throw ClinicErrorFactory.paymentRecordNotFound(
        'Nenhum agendamento encontrado para o pagamento informado',
      );
    }

    const previousStatus = appointment.paymentStatus;

    const fingerprint = this.buildEventFingerprint({
      paymentId,
      eventType,
      gatewayStatus,
      payloadId: typeof input.payload.id === 'string' ? input.payload.id : undefined,
    });

    const alreadyStored = await this.webhookEventRepository.exists({
      tenantId: appointment.tenantId,
      clinicId: appointment.clinicId,
      provider: input.provider,
      fingerprint,
    });

    if (alreadyStored) {
      this.logger.log('Webhook ASAAS ignorado: evento ja persistido anteriormente', {
        paymentId,
        eventType,
        gatewayStatus,
        fingerprint,
      });
      return;
    }

    if (this.eventAlreadyProcessed(appointment.metadata, fingerprint)) {
      this.logger.log('Webhook ASAAS ignorado: evento duplicado', {
        paymentId,
        eventType,
        gatewayStatus,
      });
      return;
    }

    const paidAt = this.resolvePaidAt(paymentPayload.paymentDate, input.receivedAt);
    const metadataPatch = this.buildMetadataPatch({
      payload: input.payload,
      gatewayStatus,
      eventType,
      receivedAt: input.receivedAt,
      fingerprint,
      previousGateway: this.extractPaymentGateway(appointment.metadata),
    });

    await this.clinicAppointmentRepository.updatePaymentStatus({
      appointmentId: appointment.id,
      paymentStatus: targetStatus,
      gatewayStatus,
      paidAt,
      eventFingerprint: fingerprint,
      metadataPatch,
    });

    await this.clinicHoldRepository.updatePaymentStatus({
      holdId: appointment.holdId,
      clinicId: appointment.clinicId,
      tenantId: appointment.tenantId,
      paymentStatus: targetStatus,
      gatewayStatus,
      paidAt,
      eventFingerprint: fingerprint,
    });

    const statusChanged = previousStatus !== targetStatus;
    const payloadId = typeof input.payload.id === 'string' ? input.payload.id : undefined;
    const amount =
      paymentPayload.value !== undefined || paymentPayload.netValue !== undefined
        ? {
            value: paymentPayload.value ?? null,
            netValue: paymentPayload.netValue ?? null,
          }
        : undefined;
    const sandbox = Boolean(input.payload?.sandbox);

    if (statusChanged) {
      await this.messageBus.publish(
        DomainEvents.clinicPaymentStatusChanged(appointment.id, {
          tenantId: appointment.tenantId,
          clinicId: appointment.clinicId,
          professionalId: appointment.professionalId,
          patientId: appointment.patientId,
          holdId: appointment.holdId,
          serviceTypeId: appointment.serviceTypeId,
          paymentTransactionId: paymentId,
          previousStatus,
          newStatus: targetStatus,
          gatewayStatus,
          eventType,
          sandbox,
          fingerprint,
          payloadId,
          amount,
          receivedAt: input.receivedAt,
          paidAt,
        }),
      );

      if (targetStatus === 'settled') {
        await this.messageBus.publish(
          DomainEvents.clinicPaymentSettled(appointment.id, {
            tenantId: appointment.tenantId,
            clinicId: appointment.clinicId,
            professionalId: appointment.professionalId,
            patientId: appointment.patientId,
            holdId: appointment.holdId,
            serviceTypeId: appointment.serviceTypeId,
            paymentTransactionId: paymentId,
            gatewayStatus,
            eventType,
            sandbox,
            fingerprint,
            payloadId,
            amount,
            settledAt: paidAt ?? input.receivedAt,
          }),
        );
      } else if (targetStatus === 'refunded') {
        await this.messageBus.publish(
          DomainEvents.clinicPaymentRefunded(appointment.id, {
            tenantId: appointment.tenantId,
            clinicId: appointment.clinicId,
            professionalId: appointment.professionalId,
            patientId: appointment.patientId,
            holdId: appointment.holdId,
            serviceTypeId: appointment.serviceTypeId,
            paymentTransactionId: paymentId,
            gatewayStatus,
            eventType,
            sandbox,
            fingerprint,
            payloadId,
            amount,
            refundedAt: paidAt ?? input.receivedAt,
          }),
        );
      } else if (targetStatus === 'chargeback') {
        await this.messageBus.publish(
          DomainEvents.clinicPaymentChargeback(appointment.id, {
            tenantId: appointment.tenantId,
            clinicId: appointment.clinicId,
            professionalId: appointment.professionalId,
            patientId: appointment.patientId,
            holdId: appointment.holdId,
            serviceTypeId: appointment.serviceTypeId,
            paymentTransactionId: paymentId,
            gatewayStatus,
            eventType,
            sandbox,
            fingerprint,
            payloadId,
            amount,
            chargebackAt: paidAt ?? input.receivedAt,
          }),
        );
      }
    }

    await this.auditService.register({
      event: 'clinic.payment.webhook_processed',
      tenantId: appointment.tenantId,
      clinicId: appointment.clinicId,
      detail: {
        paymentTransactionId: paymentId,
        event: eventType,
        previousStatus: appointment.paymentStatus,
        newStatus: targetStatus,
        gatewayStatus,
        sandbox: Boolean(input.payload?.sandbox),
        receivedAt: input.receivedAt.toISOString(),
      },
    });

    await this.recordWebhookEvent({
      appointmentId: appointment.id,
      clinicId: appointment.clinicId,
      tenantId: appointment.tenantId,
      provider: input.provider,
      paymentId,
      fingerprint,
      eventType,
      gatewayStatus,
      payloadId,
      sandbox,
      receivedAt: input.receivedAt,
    });
  }

  private isValidPaymentPayload(
    payload: ClinicPaymentWebhookPayload['payment'] | undefined,
  ): payload is ClinicPaymentWebhookPayload['payment'] & { id: string } {
    return Boolean(payload && typeof payload.id === 'string' && payload.id.trim().length > 0);
  }

  private resolvePaidAt(paymentDate?: string, fallback?: Date): Date | undefined {
    if (paymentDate) {
      const parsed = new Date(paymentDate);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    return fallback;
  }

  private buildMetadataPatch(input: {
    payload: ClinicPaymentWebhookPayload;
    gatewayStatus: string;
    eventType?: string;
    receivedAt: Date;
    fingerprint: string;
    previousGateway?: Record<string, unknown>;
  }): Record<string, unknown> {
    const snapshot = this.extractPaymentSnapshot(input.payload.payment);

    const previousGateway = input.previousGateway ?? {};
    const previousSandbox =
      typeof previousGateway['sandbox'] === 'boolean'
        ? (previousGateway['sandbox'] as boolean)
        : undefined;
    const existingEvents = Array.isArray(previousGateway.events)
      ? [...(previousGateway.events as Record<string, unknown>[])]
      : [];
    const recordedAt = input.receivedAt.toISOString();

    existingEvents.push({
      fingerprint: input.fingerprint,
      event: input.eventType ?? null,
      gatewayStatus: input.gatewayStatus,
      recordedAt,
      payloadStatus: input.payload.payment.status ?? null,
    });

    return {
      paymentGateway: {
        ...previousGateway,
        provider: 'asaas',
        lastEvent: input.eventType ?? null,
        gatewayStatus: input.gatewayStatus,
        sandbox: input.payload.sandbox ?? previousSandbox ?? false,
        receivedAt: recordedAt,
        payload: snapshot,
        events: existingEvents,
      },
    };
  }

  private extractPaymentSnapshot(
    payment: ClinicPaymentWebhookPayload['payment'],
  ): Record<string, unknown> {
    const snapshot: Record<string, unknown> = {};
    const allowedKeys: Array<keyof ClinicPaymentWebhookPayload['payment']> = [
      'id',
      'status',
      'dueDate',
      'paymentDate',
      'customer',
      'billingType',
      'netValue',
      'value',
    ];

    for (const key of allowedKeys) {
      const value = payment[key];
      if (value !== undefined) {
        snapshot[key] = value;
      }
    }

    return snapshot;
  }

  private buildEventFingerprint(input: {
    paymentId: string;
    eventType?: string;
    gatewayStatus: string;
    payloadId?: string;
  }): string {
    const parts = [
      input.paymentId.trim().toLowerCase(),
      (input.eventType ?? 'unknown_event').toLowerCase(),
      (input.gatewayStatus ?? 'unknown_status').toLowerCase(),
      input.payloadId ? input.payloadId.trim().toLowerCase() : '',
    ];

    return parts.join(':');
  }

  private eventAlreadyProcessed(
    metadata: Record<string, unknown> | undefined,
    fingerprint: string,
  ): boolean {
    const gateway = this.extractPaymentGateway(metadata);

    if (!gateway) {
      return false;
    }

    const events = Array.isArray(gateway.events) ? gateway.events : [];
    return events.some(
      (event) =>
        event &&
        typeof event === 'object' &&
        'fingerprint' in event &&
        (event as Record<string, unknown>).fingerprint === fingerprint,
    );
  }

  private extractPaymentGateway(
    metadata: Record<string, unknown> | undefined,
  ): Record<string, unknown> | undefined {
    if (!metadata || typeof metadata !== 'object') {
      return undefined;
    }

    const gateway = (metadata as Record<string, unknown>).paymentGateway;
    if (gateway && typeof gateway === 'object' && gateway !== null) {
      return gateway as Record<string, unknown>;
    }

    return undefined;
  }

  private async recordWebhookEvent(params: {
    tenantId: string;
    clinicId: string;
    provider: string;
    paymentId: string;
    fingerprint: string;
    appointmentId: string;
    eventType?: string;
    gatewayStatus?: string;
    payloadId?: string;
    sandbox?: boolean;
    receivedAt: Date;
  }): Promise<void> {
    const expiresAt = this.calculateExpiration(params.receivedAt);

    await this.webhookEventRepository.record({
      tenantId: params.tenantId,
      clinicId: params.clinicId,
      provider: params.provider,
      paymentTransactionId: params.paymentId,
      fingerprint: params.fingerprint,
      appointmentId: params.appointmentId,
      eventType: params.eventType ?? null,
      gatewayStatus: params.gatewayStatus ?? null,
      payloadId: params.payloadId ?? null,
      sandbox: params.sandbox ?? false,
      receivedAt: params.receivedAt,
      processedAt: new Date(),
      expiresAt,
    });
  }

  private calculateExpiration(receivedAt: Date): Date {
    const ttlMs = ProcessClinicPaymentWebhookUseCase.EVENT_TTL_DAYS * 24 * 60 * 60 * 1000;
    const expires = new Date(receivedAt.getTime() + ttlMs);
    return expires;
  }
}

export const ProcessClinicPaymentWebhookUseCaseToken = IProcessClinicPaymentWebhookUseCaseToken;
