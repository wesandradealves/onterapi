import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import {
  ClinicHold,
  ClinicHoldConfirmationInput,
  ClinicHoldRequestInput,
  ClinicPaymentStatus,
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
    input: ClinicHoldConfirmationInput & {
      confirmedAt: Date;
      status: 'confirmed' | 'expired';
      appointmentId?: string;
      paymentStatus?: ClinicPaymentStatus;
      gatewayStatus?: string;
    },
  ): Promise<ClinicHold> {
    const entity = await this.repository.findOneOrFail({
      where: { id: input.holdId, clinicId: input.clinicId, tenantId: input.tenantId },
    });

    entity.status = input.status;
    const metadata: Record<string, unknown> = { ...(entity.metadata ?? {}) };

    if (input.status === 'confirmed') {
      entity.confirmedAt = input.confirmedAt;
      entity.confirmedBy = input.confirmedBy;
      metadata.paymentTransactionId = input.paymentTransactionId;
      const existingConfirmation =
        typeof metadata.confirmation === 'object' && metadata.confirmation !== null
          ? (metadata.confirmation as Record<string, unknown>)
          : {};
      metadata.confirmation = {
        ...existingConfirmation,
        appointmentId: input.appointmentId ?? existingConfirmation.appointmentId,
        idempotencyKey: input.idempotencyKey,
        paymentStatus: input.paymentStatus ?? existingConfirmation.paymentStatus,
        gatewayStatus: input.gatewayStatus ?? existingConfirmation.gatewayStatus,
      };
      if (input.paymentStatus) {
        metadata.paymentStatus = input.paymentStatus;
      }
      if (input.gatewayStatus) {
        metadata.gatewayStatus = input.gatewayStatus;
      }
    } else {
      entity.confirmedAt = null;
      entity.confirmedBy = null;
      metadata.expiredAt = input.confirmedAt;
      delete metadata.paymentStatus;
      delete metadata.gatewayStatus;
    }

    entity.metadata = metadata;

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

  async findActiveOverlapByProfessional(params: {
    tenantId: string;
    professionalId: string;
    start: Date;
    end: Date;
    excludeHoldId?: string;
  }): Promise<ClinicHold[]> {
    const query = this.repository
      .createQueryBuilder('hold')
      .where('hold.tenant_id = :tenantId', { tenantId: params.tenantId })
      .andWhere('hold.professional_id = :professionalId', {
        professionalId: params.professionalId,
      })
      .andWhere('hold.status IN (:...statuses)', { statuses: ['pending', 'confirmed'] })
      .andWhere('hold.start_at < :end', { end: params.end })
      .andWhere('hold.end_at > :start', { start: params.start });

    if (params.excludeHoldId) {
      query.andWhere('hold.id <> :excludeHoldId', { excludeHoldId: params.excludeHoldId });
    }

    const entities = await query.getMany();
    return entities.map(ClinicMapper.toHold);
  }

  async findActiveOverlapByResources(params: {
    tenantId: string;
    clinicId?: string;
    start: Date;
    end: Date;
    locationId?: string;
    resources?: string[];
    excludeHoldId?: string;
  }): Promise<ClinicHold[]> {
    const hasLocation = Boolean(params.locationId);
    const resourceIds =
      params.resources
        ?.map((resource) => resource.trim())
        .filter((resource) => resource.length > 0) ?? [];

    if (!hasLocation && resourceIds.length === 0) {
      return [];
    }

    const query = this.repository
      .createQueryBuilder('hold')
      .where('hold.tenant_id = :tenantId', { tenantId: params.tenantId })
      .andWhere('hold.status IN (:...statuses)', { statuses: ['pending', 'confirmed'] })
      .andWhere('hold.start_at < :end', { end: params.end })
      .andWhere('hold.end_at > :start', { start: params.start });

    if (params.clinicId) {
      query.andWhere('hold.clinic_id = :clinicId', { clinicId: params.clinicId });
    }

    if (params.excludeHoldId) {
      query.andWhere('hold.id <> :excludeHoldId', { excludeHoldId: params.excludeHoldId });
    }

    const conditions: string[] = [];
    const conditionParams: Record<string, unknown> = {};

    if (hasLocation) {
      conditions.push('hold.location_id = :locationId');
      conditionParams.locationId = params.locationId;
    }

    if (resourceIds.length > 0) {
      conditions.push(
        `EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(hold.resources) resource
          WHERE resource = ANY(:resourceIds)
        )`,
      );
      conditionParams.resourceIds = resourceIds;
    }

    if (conditions.length === 0) {
      return [];
    }

    const whereClause = conditions.map((condition) => `(${condition})`).join(' OR ');
    query.andWhere(whereClause, conditionParams);

    const entities = await query.getMany();
    return entities.map(ClinicMapper.toHold);
  }

  async updateMetadata(params: {
    holdId: string;
    metadata: Record<string, unknown>;
  }): Promise<ClinicHold> {
    const entity = await this.repository.findOneOrFail({ where: { id: params.holdId } });
    entity.metadata = { ...(params.metadata ?? {}) };

    const saved = await this.repository.save(entity);
    return ClinicMapper.toHold(saved);
  }

  async reassignForCoverage(params: {
    tenantId: string;
    clinicId: string;
    originalProfessionalId: string;
    coverageProfessionalId: string;
    coverageId: string;
    start: Date;
    end: Date;
  }): Promise<ClinicHold[]> {
    const entities = await this.repository
      .createQueryBuilder('hold')
      .where('hold.tenant_id = :tenantId', { tenantId: params.tenantId })
      .andWhere('hold.clinic_id = :clinicId', { clinicId: params.clinicId })
      .andWhere('hold.professional_id = :professionalId', {
        professionalId: params.originalProfessionalId,
      })
      .andWhere('hold.status IN (:...statuses)', { statuses: ['pending', 'confirmed'] })
      .andWhere('hold.start_at < :endAt', { endAt: params.end })
      .andWhere('hold.end_at > :startAt', { startAt: params.start })
      .getMany();

    const updated: ClinicHold[] = [];

    for (const entity of entities) {
      const metadata =
        entity.metadata && typeof entity.metadata === 'object'
          ? { ...(entity.metadata as Record<string, unknown>) }
          : {};

      const alreadyAssigned =
        metadata.coverage &&
        typeof metadata.coverage === 'object' &&
        (metadata.coverage as Record<string, unknown>).coverageId === params.coverageId &&
        entity.professionalId === params.coverageProfessionalId;

      if (alreadyAssigned) {
        updated.push(ClinicMapper.toHold(entity));
        continue;
      }

      metadata.coverage = {
        coverageId: params.coverageId,
        originalProfessionalId: params.originalProfessionalId,
        coverageProfessionalId: params.coverageProfessionalId,
        status: 'active',
        startAt: params.start.toISOString(),
        endAt: params.end.toISOString(),
      };

      entity.metadata = metadata;
      entity.professionalId = params.coverageProfessionalId;

      const saved = await this.repository.save(entity);
      updated.push(ClinicMapper.toHold(saved));
    }

    return updated;
  }

  async releaseCoverageAssignments(params: {
    tenantId: string;
    clinicId: string;
    coverageId: string;
    reference: Date;
    originalProfessionalId: string;
    coverageProfessionalId: string;
  }): Promise<ClinicHold[]> {
    const entities = await this.repository
      .createQueryBuilder('hold')
      .where('hold.tenant_id = :tenantId', { tenantId: params.tenantId })
      .andWhere('hold.clinic_id = :clinicId', { clinicId: params.clinicId })
      .andWhere("hold.metadata -> 'coverage' ->> 'coverageId' = :coverageId", {
        coverageId: params.coverageId,
      })
      .andWhere('hold.start_at >= :reference', { reference: params.reference })
      .getMany();

    const updated: ClinicHold[] = [];

    for (const entity of entities) {
      const metadata =
        entity.metadata && typeof entity.metadata === 'object'
          ? { ...(entity.metadata as Record<string, unknown>) }
          : {};

      const coverageMetadata =
        metadata.coverage && typeof metadata.coverage === 'object'
          ? ({ ...(metadata.coverage as Record<string, unknown>) } as Record<string, unknown>)
          : undefined;

      const fallbackProfessionalId =
        (coverageMetadata?.originalProfessionalId as string | undefined) ??
        params.originalProfessionalId;

      if (!fallbackProfessionalId) {
        continue;
      }

      if (coverageMetadata) {
        coverageMetadata.status = 'completed';
        coverageMetadata.completedAt = params.reference.toISOString();
        metadata.coverage = coverageMetadata;
      } else {
        delete metadata.coverage;
      }

      entity.professionalId = fallbackProfessionalId;
      entity.metadata = metadata;

      const saved = await this.repository.save(entity);
      updated.push(ClinicMapper.toHold(saved));
    }

    return updated;
  }

  async updatePaymentStatus(params: {
    holdId: string;
    clinicId: string;
    tenantId: string;
    paymentStatus: ClinicPaymentStatus;
    gatewayStatus?: string;
    paidAt?: Date;
    eventFingerprint?: string;
  }): Promise<ClinicHold> {
    const entity = await this.repository.findOneOrFail({
      where: {
        id: params.holdId,
        clinicId: params.clinicId,
        tenantId: params.tenantId,
      },
    });

    const metadata: Record<string, unknown> = { ...(entity.metadata ?? {}) };
    const confirmationMetadata =
      typeof metadata.confirmation === 'object' && metadata.confirmation !== null
        ? (metadata.confirmation as Record<string, unknown>)
        : {};

    confirmationMetadata.paymentStatus = params.paymentStatus;
    if (params.gatewayStatus) {
      confirmationMetadata.gatewayStatus = params.gatewayStatus;
    }
    if (params.paidAt) {
      confirmationMetadata.paidAt = params.paidAt.toISOString();
    }

    const events = Array.isArray(metadata.paymentEvents)
      ? [...(metadata.paymentEvents as unknown[])]
      : [];

    const recordedAt = new Date().toISOString();
    const fingerprint = params.eventFingerprint;
    let updated = false;

    if (fingerprint) {
      const index = events.findIndex(
        (event) =>
          event &&
          typeof event === 'object' &&
          (event as Record<string, unknown>).fingerprint === fingerprint,
      );

      if (index >= 0) {
        const existing = events[index] as Record<string, unknown>;
        events[index] = {
          ...existing,
          status: params.paymentStatus,
          gatewayStatus: params.gatewayStatus,
          paidAt: params.paidAt?.toISOString(),
          recordedAt,
          fingerprint,
        };
        updated = true;
      }
    }

    if (!updated) {
      events.push({
        status: params.paymentStatus,
        gatewayStatus: params.gatewayStatus,
        paidAt: params.paidAt?.toISOString(),
        recordedAt,
        ...(fingerprint ? { fingerprint } : {}),
      });
    }

    metadata.paymentStatus = params.paymentStatus;
    if (params.gatewayStatus) {
      metadata.gatewayStatus = params.gatewayStatus;
    }
    metadata.paymentEvents = events;
    metadata.confirmation = confirmationMetadata;

    entity.metadata = metadata;

    const saved = await this.repository.save(entity);
    return ClinicMapper.toHold(saved);
  }
}
