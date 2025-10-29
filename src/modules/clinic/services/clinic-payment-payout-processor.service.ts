import { Inject, Injectable, Logger } from '@nestjs/common';

import { ClinicPaymentPayoutRequest } from '../../../domain/clinic/types/clinic.types';
import {
  IClinicPaymentPayoutRequestRepository,
  IClinicPaymentPayoutRequestRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-payment-payout-request.repository.interface';
import { ClinicAuditService } from '../../../infrastructure/clinic/services/clinic-audit.service';
import { ClinicPaymentPayoutRequestedEvent } from './clinic-payment-event.types';

@Injectable()
export class ClinicPaymentPayoutProcessorService {
  private readonly logger = new Logger(ClinicPaymentPayoutProcessorService.name);

  constructor(
    @Inject(IClinicPaymentPayoutRequestRepositoryToken)
    private readonly payoutRepository: IClinicPaymentPayoutRequestRepository,
    private readonly auditService: ClinicAuditService,
  ) {}

  async handleEvent(event: ClinicPaymentPayoutRequestedEvent): Promise<void> {
    const payload = event.payload;

    if (payload.fingerprint) {
      const duplicate = await this.payoutRepository.existsByFingerprint(
        payload.clinicId,
        payload.tenantId,
        payload.fingerprint,
      );

      if (duplicate) {
        this.logger.log('Payout request ignored (fingerprint already queued)', {
          appointmentId: payload.appointmentId,
          paymentTransactionId: payload.paymentTransactionId,
          fingerprint: payload.fingerprint,
        });
        return;
      }
    }

    const alreadyQueued = await this.payoutRepository.existsByTransaction(
      payload.clinicId,
      payload.tenantId,
      payload.paymentTransactionId,
    );

    if (alreadyQueued) {
      this.logger.log('Payout request ignored (transaction already queued)', {
        appointmentId: payload.appointmentId,
        paymentTransactionId: payload.paymentTransactionId,
      });
      return;
    }

    const record = await this.payoutRepository.enqueue({
      appointmentId: payload.appointmentId,
      tenantId: payload.tenantId,
      clinicId: payload.clinicId,
      professionalId: payload.professionalId,
      originalProfessionalId: payload.originalProfessionalId ?? null,
      coverageId: payload.coverageId ?? null,
      patientId: payload.patientId,
      holdId: payload.holdId,
      serviceTypeId: payload.serviceTypeId,
      paymentTransactionId: payload.paymentTransactionId,
      provider: payload.provider,
      credentialsId: payload.credentialsId,
      sandboxMode: payload.sandboxMode,
      bankAccountId: payload.bankAccountId ?? null,
      settledAt: payload.settledAt,
      baseAmountCents: payload.baseAmountCents,
      netAmountCents: payload.netAmountCents ?? null,
      remainderCents: payload.remainderCents,
      split: payload.split,
      currency: payload.currency,
      gatewayStatus: payload.gatewayStatus,
      eventType: payload.eventType ?? null,
      fingerprint: payload.fingerprint ?? null,
      payloadId: payload.payloadId ?? null,
      sandbox: payload.sandbox,
      requestedAt: payload.requestedAt ?? new Date(),
    });

    await this.auditService.register({
      event: 'clinic.payment.payout_queued',
      tenantId: payload.tenantId,
      clinicId: payload.clinicId,
      detail: this.toAuditDetail(record),
    });

    this.logger.log('Payout request queued successfully', {
      appointmentId: payload.appointmentId,
      payoutRequestId: record.id,
      paymentTransactionId: payload.paymentTransactionId,
    });
  }

  private toAuditDetail(record: ClinicPaymentPayoutRequest): Record<string, unknown> {
    return {
      payoutId: record.id,
      appointmentId: record.appointmentId,
      paymentTransactionId: record.paymentTransactionId,
      provider: record.provider,
      credentialsId: record.credentialsId,
      sandboxMode: record.sandboxMode,
      baseAmountCents: record.baseAmountCents,
      netAmountCents: record.netAmountCents ?? null,
      remainderCents: record.remainderCents,
      currency: record.currency,
      split: record.split,
      gatewayStatus: record.gatewayStatus,
      eventType: record.eventType ?? null,
      fingerprint: record.fingerprint ?? null,
      payloadId: record.payloadId ?? null,
      sandbox: record.sandbox,
      settledAt: record.settledAt.toISOString(),
      requestedAt: record.requestedAt.toISOString(),
      originalProfessionalId: record.originalProfessionalId,
      coverageId: record.coverageId,
    };
  }
}
