import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, QueryFailedError, Repository } from 'typeorm';

import {
  FindClinicPaymentWebhookEventInput,
  IClinicPaymentWebhookEventRepository,
  RecordClinicPaymentWebhookEventInput,
} from '../../../domain/clinic/interfaces/repositories/clinic-payment-webhook-event.repository.interface';
import { ClinicPaymentWebhookEventRecord } from '../../../domain/clinic/types/clinic.types';
import { ClinicPaymentWebhookEventEntity } from '../entities/clinic-payment-webhook-event.entity';

@Injectable()
export class ClinicPaymentWebhookEventRepository implements IClinicPaymentWebhookEventRepository {
  constructor(
    @InjectRepository(ClinicPaymentWebhookEventEntity)
    private readonly repository: Repository<ClinicPaymentWebhookEventEntity>,
  ) {}

  async exists(params: FindClinicPaymentWebhookEventInput): Promise<boolean> {
    const found = await this.repository.findOne({
      where: {
        tenantId: params.tenantId,
        clinicId: params.clinicId,
        provider: params.provider,
        fingerprint: params.fingerprint,
      },
    });

    return Boolean(found);
  }

  async record(
    params: RecordClinicPaymentWebhookEventInput,
  ): Promise<ClinicPaymentWebhookEventRecord> {
    const entity = this.repository.create({
      tenantId: params.tenantId,
      clinicId: params.clinicId,
      provider: params.provider,
      paymentTransactionId: params.paymentTransactionId,
      fingerprint: params.fingerprint,
      appointmentId: params.appointmentId ?? null,
      eventType: params.eventType ?? null,
      gatewayStatus: params.gatewayStatus ?? null,
      payloadId: params.payloadId ?? null,
      sandbox: Boolean(params.sandbox),
      receivedAt: params.receivedAt,
      processedAt: params.processedAt,
      expiresAt: params.expiresAt ?? null,
    });

    try {
      const saved = await this.repository.save(entity);

      return this.toRecord(saved);
    } catch (error) {
      if (this.isUniqueConstraintViolation(error)) {
        const existing = await this.repository.findOne({
          where: {
            tenantId: params.tenantId,
            clinicId: params.clinicId,
            provider: params.provider,
            fingerprint: params.fingerprint,
          },
        });

        if (existing) {
          return this.toRecord(existing);
        }
      }

      throw error;
    }
  }

  async purgeExpired(reference: Date): Promise<number> {
    const { affected } = await this.repository.delete({
      expiresAt: LessThan(reference),
    });

    return affected ?? 0;
  }

  private toRecord(entity: ClinicPaymentWebhookEventEntity): ClinicPaymentWebhookEventRecord {
    return {
      id: entity.id,
      tenantId: entity.tenantId,
      clinicId: entity.clinicId,
      provider: entity.provider,
      paymentTransactionId: entity.paymentTransactionId,
      fingerprint: entity.fingerprint,
      appointmentId: entity.appointmentId,
      eventType: entity.eventType,
      gatewayStatus: entity.gatewayStatus,
      payloadId: entity.payloadId,
      sandbox: entity.sandbox,
      receivedAt: entity.receivedAt,
      processedAt: entity.processedAt,
      expiresAt: entity.expiresAt ?? undefined,
      createdAt: entity.createdAt,
    };
  }

  private isUniqueConstraintViolation(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      typeof error.driverError?.code === 'string' &&
      error.driverError.code === '23505'
    );
  }
}
