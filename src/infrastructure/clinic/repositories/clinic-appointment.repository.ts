import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  ClinicAppointment,
  ClinicAppointmentStatus,
  ClinicPaymentStatus,
} from '../../../domain/clinic/types/clinic.types';
import {
  CreateClinicAppointmentInput,
  IClinicAppointmentRepository,
  UpdateClinicAppointmentPaymentStatusInput,
} from '../../../domain/clinic/interfaces/repositories/clinic-appointment.repository.interface';
import { ClinicAppointmentEntity } from '../entities/clinic-appointment.entity';
import { ClinicMapper } from '../mappers/clinic.mapper';

@Injectable()
export class ClinicAppointmentRepository implements IClinicAppointmentRepository {
  constructor(
    @InjectRepository(ClinicAppointmentEntity)
    private readonly repository: Repository<ClinicAppointmentEntity>,
  ) {}

  async create(input: CreateClinicAppointmentInput): Promise<ClinicAppointment> {
    const entity = this.repository.create({
      clinicId: input.clinicId,
      tenantId: input.tenantId,
      holdId: input.holdId,
      professionalId: input.professionalId,
      patientId: input.patientId,
      serviceTypeId: input.serviceTypeId,
      startAt: input.start,
      endAt: input.end,
      status: 'scheduled',
      paymentStatus: input.paymentStatus,
      paymentTransactionId: input.paymentTransactionId,
      confirmedAt: input.confirmedAt,
      metadata: input.metadata ?? {},
    });

    const saved = await this.repository.save(entity);
    return ClinicMapper.toAppointment(saved);
  }

  async findById(appointmentId: string): Promise<ClinicAppointment | null> {
    const entity = await this.repository.findOne({ where: { id: appointmentId } });
    return entity ? ClinicMapper.toAppointment(entity) : null;
  }

  async findByHoldId(holdId: string): Promise<ClinicAppointment | null> {
    const entity = await this.repository.findOne({ where: { holdId } });
    return entity ? ClinicMapper.toAppointment(entity) : null;
  }

  async findByPaymentTransactionId(
    paymentTransactionId: string,
  ): Promise<ClinicAppointment | null> {
    const entity = await this.repository.findOne({ where: { paymentTransactionId } });
    return entity ? ClinicMapper.toAppointment(entity) : null;
  }

  async findActiveOverlap(params: {
    tenantId: string;
    professionalId: string;
    start: Date;
    end: Date;
    excludeAppointmentId?: string;
  }): Promise<ClinicAppointment[]> {
    const scheduledStatus: ClinicAppointmentStatus = 'scheduled';

    const query = this.repository
      .createQueryBuilder('appointment')
      .where('appointment.tenant_id = :tenantId', { tenantId: params.tenantId })
      .andWhere('appointment.professional_id = :professionalId', {
        professionalId: params.professionalId,
      })
      .andWhere('appointment.status = :status', { status: scheduledStatus })
      .andWhere('appointment.start_at < :end', { end: params.end })
      .andWhere('appointment.end_at > :start', { start: params.start });

    if (params.excludeAppointmentId) {
      query.andWhere('appointment.id <> :excludeAppointmentId', {
        excludeAppointmentId: params.excludeAppointmentId,
      });
    }

    const entities = await query.getMany();
    return entities.map(ClinicMapper.toAppointment);
  }

  async updatePaymentStatus(
    input: UpdateClinicAppointmentPaymentStatusInput,
  ): Promise<ClinicAppointment> {
    type PaymentHistoryEntry = {
      status?: ClinicPaymentStatus;
      gatewayStatus?: string;
      paidAt?: string;
      recordedAt?: string;
      [key: string]: unknown;
    };

    const entity = await this.repository.findOneOrFail({ where: { id: input.appointmentId } });

    entity.paymentStatus = input.paymentStatus;

    const metadata: Record<string, unknown> = { ...(entity.metadata ?? {}) };
    const paymentMetadata =
      typeof metadata.payment === 'object' && metadata.payment !== null
        ? (metadata.payment as Record<string, unknown>)
        : {};

    paymentMetadata.lastStatus = input.paymentStatus;
    if (input.gatewayStatus) {
      paymentMetadata.gatewayStatus = input.gatewayStatus;
      metadata.gatewayStatus = input.gatewayStatus;
    }

    if (input.paidAt) {
      paymentMetadata.paidAt = input.paidAt.toISOString();
    }

    const history = Array.isArray(paymentMetadata.history)
      ? [...(paymentMetadata.history as PaymentHistoryEntry[])]
      : [];
    const normalizedPaidAt = input.paidAt?.toISOString();
    const lastEntry = history.length > 0 ? history[history.length - 1] : undefined;
    const shouldAppend =
      !lastEntry ||
      lastEntry.status !== input.paymentStatus ||
      lastEntry.gatewayStatus !== input.gatewayStatus ||
      lastEntry.paidAt !== normalizedPaidAt;

    const recordedAt = new Date().toISOString();

    const fingerprint = input.eventFingerprint;
    let updated = false;
    if (fingerprint) {
      const index = history.findIndex(
        (entry) =>
          entry &&
          typeof entry === 'object' &&
          (entry as Record<string, unknown>).fingerprint === fingerprint,
      );

      if (index >= 0) {
        history[index] = {
          ...history[index],
          status: input.paymentStatus,
          gatewayStatus: input.gatewayStatus,
          paidAt: normalizedPaidAt,
          recordedAt,
          fingerprint,
        };
        updated = true;
      }
    }

    if (!updated) {
      if (shouldAppend) {
        history.push({
          status: input.paymentStatus,
          gatewayStatus: input.gatewayStatus,
          paidAt: normalizedPaidAt,
          recordedAt,
          fingerprint,
        });
      } else if (lastEntry) {
        history[history.length - 1] = {
          ...lastEntry,
          recordedAt,
          status: input.paymentStatus,
          gatewayStatus: input.gatewayStatus,
          paidAt: normalizedPaidAt,
          ...(fingerprint ? { fingerprint } : {}),
        };
      }
    }

    paymentMetadata.history = history;
    paymentMetadata.updatedAt = recordedAt;
    metadata.paymentStatus = input.paymentStatus;
    metadata.payment = paymentMetadata;

    if (input.metadataPatch) {
      Object.assign(metadata, input.metadataPatch);
    }

    entity.metadata = metadata;

    const saved = await this.repository.save(entity);
    return ClinicMapper.toAppointment(saved);
  }

  async reassignForCoverage(params: {
    tenantId: string;
    clinicId: string;
    originalProfessionalId: string;
    coverageProfessionalId: string;
    coverageId: string;
    start: Date;
    end: Date;
  }): Promise<ClinicAppointment[]> {
    const entities = await this.repository
      .createQueryBuilder('appointment')
      .where('appointment.tenant_id = :tenantId', { tenantId: params.tenantId })
      .andWhere('appointment.clinic_id = :clinicId', { clinicId: params.clinicId })
      .andWhere('appointment.professional_id = :professionalId', {
        professionalId: params.originalProfessionalId,
      })
      .andWhere('appointment.status IN (:...statuses)', { statuses: ['scheduled', 'confirmed'] })
      .andWhere('appointment.start_at < :endAt', { endAt: params.end })
      .andWhere('appointment.end_at > :startAt', { startAt: params.start })
      .getMany();

    const updated: ClinicAppointment[] = [];

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
        updated.push(ClinicMapper.toAppointment(entity));
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
      updated.push(ClinicMapper.toAppointment(saved));
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
  }): Promise<ClinicAppointment[]> {
    const entities = await this.repository
      .createQueryBuilder('appointment')
      .where('appointment.tenant_id = :tenantId', { tenantId: params.tenantId })
      .andWhere('appointment.clinic_id = :clinicId', { clinicId: params.clinicId })
      .andWhere("appointment.metadata -> 'coverage' ->> 'coverageId' = :coverageId", {
        coverageId: params.coverageId,
      })
      .andWhere('appointment.start_at >= :reference', { reference: params.reference })
      .getMany();

    const updated: ClinicAppointment[] = [];

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
      updated.push(ClinicMapper.toAppointment(saved));
    }

    return updated;
  }

  async updateMetadata(params: {
    appointmentId: string;
    metadataPatch: Record<string, unknown>;
  }): Promise<ClinicAppointment> {
    const entity = await this.repository.findOneOrFail({ where: { id: params.appointmentId } });

    const metadata: Record<string, unknown> = { ...(entity.metadata ?? {}) };
    for (const [key, value] of Object.entries(params.metadataPatch)) {
      metadata[key] = value;
    }

    entity.metadata = metadata;
    const saved = await this.repository.save(entity);
    return ClinicMapper.toAppointment(saved);
  }

  async listByClinic(params: {
    clinicId: string;
    tenantId: string;
    paymentStatuses?: ClinicPaymentStatus[];
    fromConfirmedAt?: Date;
    toConfirmedAt?: Date;
    limit?: number;
    offset?: number;
  }): Promise<ClinicAppointment[]> {
    const query = this.repository
      .createQueryBuilder('appointment')
      .where('appointment.clinic_id = :clinicId', { clinicId: params.clinicId })
      .andWhere('appointment.tenant_id = :tenantId', { tenantId: params.tenantId });

    if (params.paymentStatuses && params.paymentStatuses.length > 0) {
      query.andWhere('appointment.payment_status IN (:...statuses)', {
        statuses: params.paymentStatuses,
      });
    }

    if (params.fromConfirmedAt) {
      query.andWhere('appointment.confirmed_at >= :from', { from: params.fromConfirmedAt });
    }

    if (params.toConfirmedAt) {
      query.andWhere('appointment.confirmed_at <= :to', { to: params.toConfirmedAt });
    }

    query.orderBy('appointment.confirmed_at', 'DESC');

    if (typeof params.offset === 'number') {
      query.skip(params.offset);
    }

    query.take(params.limit ?? 50);

    const entities = await query.getMany();
    return entities.map(ClinicMapper.toAppointment);
  }

  async countByProfessionalAndPaymentStatus(params: {
    clinicId: string;
    tenantId: string;
    professionalId: string;
    statuses: ClinicPaymentStatus[];
  }): Promise<number> {
    if (!params.professionalId) {
      return 0;
    }

    const query = this.repository
      .createQueryBuilder('appointment')
      .where('appointment.clinic_id = :clinicId', { clinicId: params.clinicId })
      .andWhere('appointment.tenant_id = :tenantId', { tenantId: params.tenantId })
      .andWhere('appointment.professional_id = :professionalId', {
        professionalId: params.professionalId,
      });

    if (params.statuses && params.statuses.length > 0) {
      query.andWhere('appointment.payment_status IN (:...statuses)', {
        statuses: params.statuses,
      });
    }

    return query.getCount();
  }
}
