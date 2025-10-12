import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import {
  ClinicHold,
  ClinicHoldConfirmationInput,
  ClinicHoldRequestInput,
} from '../../../domain/clinic/types/clinic.types';
import { IClinicHoldRepository } from '../../../domain/clinic/interfaces/repositories/clinic-hold.repository.interface';
import { ClinicHoldEntity } from '../entities/clinic-hold.entity';
import { ClinicMapper } from '../mappers/clinic.mapper';

@Injectable()
export class ClinicHoldRepository implements IClinicHoldRepository {
  constructor(
    @InjectRepository(ClinicHoldEntity)
    private readonly repository: Repository<ClinicHoldEntity>,
  ) {}

  async create(input: ClinicHoldRequestInput & { ttlExpiresAt: Date }): Promise<ClinicHold> {
    const entity = this.repository.create({
      clinicId: input.clinicId,
      tenantId: input.tenantId,
      professionalId: input.professionalId,
      patientId: input.patientId,
      serviceTypeId: input.serviceTypeId,
      start: input.start,
      end: input.end,
      ttlExpiresAt: input.ttlExpiresAt,
      status: 'pending',
      locationId: input.locationId ?? null,
      resources: input.resources ?? [],
      idempotencyKey: input.idempotencyKey,
      createdBy: input.requestedBy,
      metadata: input.metadata ?? {},
    });

    const saved = await this.repository.save(entity);
    return ClinicMapper.toHold(saved);
  }

  async findById(holdId: string): Promise<ClinicHold | null> {
    const entity = await this.repository.findOne({ where: { id: holdId } });
    if (!entity) return null;
    return ClinicMapper.toHold(entity);
  }

  async findByIdempotencyKey(
    clinicId: string,
    tenantId: string,
    idempotencyKey: string,
  ): Promise<ClinicHold | null> {
    const entity = await this.repository.findOne({
      where: { clinicId, tenantId, idempotencyKey },
    });

    if (!entity) return null;
    return ClinicMapper.toHold(entity);
  }

  async listActiveByClinic(clinicId: string): Promise<ClinicHold[]> {
    const entities = await this.repository.find({
      where: { clinicId, status: In(['pending', 'confirmed']) },
      order: { createdAt: 'DESC' },
    });

    return entities.map(ClinicMapper.toHold);
  }

  async confirmHold(
    input: ClinicHoldConfirmationInput & { confirmedAt: Date; status: 'confirmed' | 'expired' },
  ): Promise<ClinicHold> {
    const entity = await this.repository.findOneOrFail({
      where: { id: input.holdId, clinicId: input.clinicId, tenantId: input.tenantId },
    });

    entity.status = input.status;
    entity.confirmedAt = input.status === 'confirmed' ? input.confirmedAt : null;
    entity.confirmedBy = input.status === 'confirmed' ? input.confirmedBy : null;
    entity.metadata = {
      ...(entity.metadata ?? {}),
      paymentTransactionId: input.paymentTransactionId,
    };

    const saved = await this.repository.save(entity);
    return ClinicMapper.toHold(saved);
  }

  async cancelHold(params: {
    holdId: string;
    cancelledBy: string;
    reason?: string;
    cancelledAt?: Date;
  }): Promise<ClinicHold> {
    const entity = await this.repository.findOneOrFail({ where: { id: params.holdId } });
    entity.status = 'cancelled';
    entity.cancelledAt = params.cancelledAt ?? new Date();
    entity.cancelledBy = params.cancelledBy;
    entity.cancellationReason = params.reason ?? null;

    const saved = await this.repository.save(entity);
    return ClinicMapper.toHold(saved);
  }

  async expireHold(holdId: string, expiredAt: Date): Promise<ClinicHold> {
    const entity = await this.repository.findOneOrFail({ where: { id: holdId } });
    entity.status = 'expired';
    entity.ttlExpiresAt = expiredAt;

    const saved = await this.repository.save(entity);
    return ClinicMapper.toHold(saved);
  }

  async expireHoldsBefore(referenceDate: Date): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .update()
      .set({ status: 'expired' })
      .where('status = :status', { status: 'pending' })
      .andWhere('ttl_expires_at < :referenceDate', { referenceDate })
      .execute();

    return result.affected ?? 0;
  }
}
