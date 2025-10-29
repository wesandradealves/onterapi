import { Injectable, Logger } from '@nestjs/common';

import {
  ClinicCurrency,
  ClinicPaymentSplitAllocation,
} from '../../../domain/clinic/types/clinic.types';
import { DomainEvents } from '../../../shared/events/domain-events';
import { MessageBus } from '../../../shared/messaging/message-bus';

export interface ClinicPaymentPayoutRequest {
  appointmentId: string;
  tenantId: string;
  clinicId: string;
  professionalId: string;
  originalProfessionalId?: string | null;
  coverageId?: string | null;
  patientId: string;
  holdId: string;
  serviceTypeId: string;
  paymentTransactionId: string;
  provider: string;
  credentialsId: string;
  sandboxMode: boolean;
  bankAccountId?: string;
  settlement: {
    settledAt: Date;
    baseAmountCents: number;
    netAmountCents?: number | null;
    split: ClinicPaymentSplitAllocation[];
    remainderCents: number;
  };
  currency: ClinicCurrency;
  gateway: {
    status: string;
    eventType?: string;
    fingerprint?: string;
    payloadId?: string;
    sandbox: boolean;
  };
}

@Injectable()
export class ClinicPaymentPayoutService {
  private readonly logger = new Logger(ClinicPaymentPayoutService.name);

  constructor(private readonly messageBus: MessageBus) {}

  async requestPayout(request: ClinicPaymentPayoutRequest): Promise<void> {
    await this.messageBus.publish(
      DomainEvents.billingClinicPaymentPayoutRequested(request.appointmentId, {
        tenantId: request.tenantId,
        clinicId: request.clinicId,
        professionalId: request.professionalId,
        originalProfessionalId: request.originalProfessionalId ?? undefined,
        coverageId: request.coverageId ?? undefined,
        patientId: request.patientId,
        holdId: request.holdId,
        serviceTypeId: request.serviceTypeId,
        paymentTransactionId: request.paymentTransactionId,
        provider: request.provider,
        credentialsId: request.credentialsId,
        sandboxMode: request.sandboxMode,
        bankAccountId: request.bankAccountId,
        settledAt: request.settlement.settledAt,
        baseAmountCents: request.settlement.baseAmountCents,
        netAmountCents: request.settlement.netAmountCents ?? null,
        split: request.settlement.split,
        remainderCents: request.settlement.remainderCents,
        currency: request.currency,
        gatewayStatus: request.gateway.status,
        eventType: request.gateway.eventType,
        fingerprint: request.gateway.fingerprint,
        payloadId: request.gateway.payloadId,
        sandbox: request.gateway.sandbox,
      }),
    );

    this.logger.debug('Clinic payment payout enqueued', {
      appointmentId: request.appointmentId,
      clinicId: request.clinicId,
      paymentTransactionId: request.paymentTransactionId,
      provider: request.provider,
      splitCount: request.settlement.split.length,
      remainderCents: request.settlement.remainderCents,
      sandbox: request.gateway.sandbox,
      requestedAt: new Date().toISOString(),
      settledAt: request.settlement.settledAt.toISOString(),
    });
  }
}
