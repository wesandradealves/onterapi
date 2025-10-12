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
  type IProcessClinicPaymentWebhookUseCase,
  IProcessClinicPaymentWebhookUseCase as IProcessClinicPaymentWebhookUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/process-clinic-payment-webhook.use-case.interface';
import {
  ClinicPaymentWebhookPayload,
  ProcessClinicPaymentWebhookInput,
} from '../../../domain/clinic/types/clinic.types';
import { ClinicAuditService } from '../../../infrastructure/clinic/services/clinic-audit.service';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';
import {
  mapAsaasEventToPaymentStatus,
  mapAsaasPaymentStatus,
} from '../utils/asaas-payment-status.mapper';

@Injectable()
export class ProcessClinicPaymentWebhookUseCase
  extends BaseUseCase<ProcessClinicPaymentWebhookInput, void>
  implements IProcessClinicPaymentWebhookUseCase
{
  protected readonly logger = new Logger(ProcessClinicPaymentWebhookUseCase.name);

  constructor(
    @Inject(IClinicAppointmentRepositoryToken)
    private readonly clinicAppointmentRepository: IClinicAppointmentRepository,
    @Inject(IClinicHoldRepositoryToken)
    private readonly clinicHoldRepository: IClinicHoldRepository,
    private readonly auditService: ClinicAuditService,
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

    const paidAt = this.resolvePaidAt(paymentPayload.paymentDate, input.receivedAt);
    const metadataPatch = this.buildMetadataPatch({
      payload: input.payload,
      gatewayStatus,
      eventType,
      receivedAt: input.receivedAt,
    });

    await this.clinicAppointmentRepository.updatePaymentStatus({
      appointmentId: appointment.id,
      paymentStatus: targetStatus,
      gatewayStatus,
      paidAt,
      metadataPatch,
    });

    await this.clinicHoldRepository.updatePaymentStatus({
      holdId: appointment.holdId,
      clinicId: appointment.clinicId,
      tenantId: appointment.tenantId,
      paymentStatus: targetStatus,
      gatewayStatus,
      paidAt,
    });

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
  }): Record<string, unknown> {
    const snapshot = this.extractPaymentSnapshot(input.payload.payment);

    return {
      paymentGateway: {
        provider: 'asaas',
        lastEvent: input.eventType ?? null,
        gatewayStatus: input.gatewayStatus,
        sandbox: Boolean(input.payload.sandbox),
        receivedAt: input.receivedAt.toISOString(),
        payload: snapshot,
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
}

export const ProcessClinicPaymentWebhookUseCaseToken = IProcessClinicPaymentWebhookUseCaseToken;
