import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import {
  ClinicPaymentPayoutRequest,
  ClinicPaymentPayoutStatus,
  EnqueueClinicPaymentPayoutRequestInput,
} from '../../../domain/clinic/types/clinic.types';
import {
  IClinicPaymentPayoutRequestRepository,
  LeaseClinicPaymentPayoutRequestsParams,
} from '../../../domain/clinic/interfaces/repositories/clinic-payment-payout-request.repository.interface';
import { ClinicPaymentPayoutRequestEntity } from '../entities/clinic-payment-payout-request.entity';

@Injectable()
export class ClinicPaymentPayoutRequestRepository implements IClinicPaymentPayoutRequestRepository {
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
      settledAt: input.settledAt,
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
      providerPayoutId: null,
      providerStatus: null,
      providerPayload: null,
      executedAt: null,
      status: 'pending',
      requestedAt: input.requestedAt,
    });

    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async leasePending(
    params: LeaseClinicPaymentPayoutRequestsParams,
  ): Promise<ClinicPaymentPayoutRequest[]> {
    if (params.limit <= 0) {
      return [];
    }

    const now = new Date();
    const retryThreshold = new Date(now.getTime() - params.retryAfterMs);
    const stuckThreshold = new Date(now.getTime() - params.stuckAfterMs);

    return this.repository.manager.transaction(async (manager) => {
      const qb = manager
        .createQueryBuilder(ClinicPaymentPayoutRequestEntity, 'payout')
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .where('payout.status = :pending', { pending: 'pending' })
        .orWhere(
          `(payout.status = :failed AND payout.attempts < :maxAttempts AND (payout.last_attempted_at IS NULL OR payout.last_attempted_at <= :retryThreshold))`,
        )
        .orWhere(
          `(payout.status = :processing AND payout.last_attempted_at IS NOT NULL AND payout.last_attempted_at <= :stuckThreshold)`,
        )
        .setParameters({
          failed: 'failed',
          processing: 'processing',
          maxAttempts: params.maxAttempts,
          retryThreshold,
          stuckThreshold,
        })
        .orderBy('payout.requested_at', 'ASC')
        .limit(params.limit);

      const entities = await qb.getMany();

      if (entities.length === 0) {
        return [];
      }

      const acquired = entities.map((entity) => {
        entity.status = 'processing';
        entity.attempts = (entity.attempts ?? 0) + 1;
        entity.lastAttemptedAt = now;
        entity.lastError = null;
        return entity;
      });

      const saved = await manager.save(acquired);
      return saved.map((entity) => this.toDomain(entity));
    });
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
    providerPayoutId?: string | null;
    providerStatus?: string | null;
    providerPayload?: Record<string, unknown> | null;
    executedAt?: Date | null;
  }): Promise<void> {
    const updatePayload: QueryDeepPartialEntity<ClinicPaymentPayoutRequestEntity> = {
      status: params.status,
      attempts: params.attempts,
      lastError: params.lastError ?? null,
      lastAttemptedAt: params.lastAttemptedAt ?? null,
      processedAt: params.processedAt ?? null,
      providerPayoutId:
        params.providerPayoutId === undefined ? undefined : (params.providerPayoutId ?? null),
      providerStatus:
        params.providerStatus === undefined ? undefined : (params.providerStatus ?? null),
      providerPayload:
        params.providerPayload === undefined
          ? undefined
          : ((params.providerPayload ?? null) as QueryDeepPartialEntity<
              ClinicPaymentPayoutRequestEntity['providerPayload']
            >),
      executedAt: params.executedAt === undefined ? undefined : (params.executedAt ?? null),
    };

    await this.repository.update({ id: params.payoutId }, updatePayload);
  }

  private toDomain(entity: ClinicPaymentPayoutRequestEntity): ClinicPaymentPayoutRequest {
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
      settledAt: entity.settledAt,
      providerPayoutId: entity.providerPayoutId ?? null,
      providerStatus: entity.providerStatus ?? null,
      providerPayload: entity.providerPayload ?? null,
      executedAt: entity.executedAt ?? null,
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
