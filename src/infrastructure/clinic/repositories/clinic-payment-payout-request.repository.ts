import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  EnqueueClinicPaymentPayoutRequestInput,
  ClinicPaymentPayoutRequest,
  ClinicPaymentPayoutStatus,
} from '../../../domain/clinic/types/clinic.types';
import {
  IClinicPaymentPayoutRequestRepository,
} from '../../../domain/clinic/interfaces/repositories/clinic-payment-payout-request.repository.interface';
import { ClinicPaymentPayoutRequestEntity } from '../entities/clinic-payment-payout-request.entity';

@Injectable()
export class ClinicPaymentPayoutRequestRepository
  implements IClinicPaymentPayoutRequestRepository
{
  constructor(
    @InjectRepository(ClinicPaymentPayoutRequestEntity)
    private readonly repository: Repository<ClinicPaymentPayoutRequestEntity>,
  ) {}

  async enqueue(
    input: EnqueueClinicPaymentPayoutRequestInput,
  ): Promise<ClinicPaymentPayoutRequest> {
    const entity = this.repository.create({
      appointmentId: input.appointmentId,
      tenantId: input.tenantId,
      clinicId: input.clinicId,
      professionalId: input.professionalId,
      patientId: input.patientId,
      holdId: input.holdId,
      serviceTypeId: input.serviceTypeId,
      paymentTransactionId: input.paymentTransactionId,
      provider: input.provider,
      credentialsId: input.credentialsId,
      sandboxMode: input.sandboxMode,
      bankAccountId: input.bankAccountId ?? null,
      baseAmountCents: input.baseAmountCents,
      netAmountCents: input.netAmountCents ?? null,
      remainderCents: input.remainderCents,
      split: input.split,
      currency: input.currency,
      gatewayStatus: input.gatewayStatus,
      eventType: input.eventType ?? null,
      fingerprint: input.fingerprint ?? null,
      payloadId: input.payloadId ?? null,
      sandbox: input.sandbox,
      status: 'pending',
      requestedAt: input.requestedAt,
    });

    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async existsByFingerprint(
    clinicId: string,
    tenantId: string,
    fingerprint: string,
  ): Promise<boolean> {
    const count = await this.repository.count({
      where: {
        clinicId,
        tenantId,
        fingerprint,
      },
    });

    return count > 0;
  }

  async existsByTransaction(
    clinicId: string,
    tenantId: string,
    paymentTransactionId: string,
  ): Promise<boolean> {
    const count = await this.repository.count({
      where: {
        clinicId,
        tenantId,
        paymentTransactionId,
      },
    });

    return count > 0;
  }

  async updateStatus(params: {
    payoutId: string;
    status: ClinicPaymentPayoutStatus;
    attempts?: number;
    lastError?: string | null;
    lastAttemptedAt?: Date | null;
    processedAt?: Date | null;
  }): Promise<void> {
    await this.repository.update(
      { id: params.payoutId },
      {
        status: params.status,
        attempts: params.attempts,
        lastError: params.lastError ?? null,
        lastAttemptedAt: params.lastAttemptedAt ?? null,
        processedAt: params.processedAt ?? null,
      },
    );
  }

  private toDomain(
    entity: ClinicPaymentPayoutRequestEntity,
  ): ClinicPaymentPayoutRequest {
    return {
      id: entity.id,
      appointmentId: entity.appointmentId,
      tenantId: entity.tenantId,
      clinicId: entity.clinicId,
      professionalId: entity.professionalId,
      patientId: entity.patientId,
      holdId: entity.holdId,
      serviceTypeId: entity.serviceTypeId,
      paymentTransactionId: entity.paymentTransactionId,
      provider: entity.provider,
      credentialsId: entity.credentialsId,
      sandboxMode: entity.sandboxMode,
      bankAccountId: entity.bankAccountId ?? null,
      baseAmountCents: entity.baseAmountCents,
      netAmountCents: entity.netAmountCents ?? null,
      remainderCents: entity.remainderCents,
      split: entity.split,
      currency: entity.currency as ClinicPaymentPayoutRequest['currency'],
      gatewayStatus: entity.gatewayStatus,
      eventType: entity.eventType ?? null,
      fingerprint: entity.fingerprint ?? null,
      payloadId: entity.payloadId ?? null,
      sandbox: entity.sandbox,
      status: entity.status,
      attempts: entity.attempts,
      lastError: entity.lastError ?? null,
      requestedAt: entity.requestedAt,
      lastAttemptedAt: entity.lastAttemptedAt ?? null,
      processedAt: entity.processedAt ?? null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
