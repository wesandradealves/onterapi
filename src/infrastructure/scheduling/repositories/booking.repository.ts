import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Between, DataSource, DeepPartial, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import {
  Booking,
  MarkNoShowInput,
  NewBooking,
  RecordPaymentStatusInput,
  RescheduleBookingInput,
  UpdateBookingStatusInput,
} from '../../../domain/scheduling/types/scheduling.types';
import { IBookingRepository } from '../../../domain/scheduling/interfaces/repositories/booking.repository.interface';
import { BookingEntity } from '../entities/booking.entity';
import { mapBookingEntityToDomain } from '../../../shared/mappers/scheduling.mapper';

@Injectable()
export class BookingRepository implements IBookingRepository {
  private readonly logger = new Logger(BookingRepository.name);
  private readonly repository: Repository<BookingEntity>;

  constructor(@InjectDataSource() dataSource: DataSource) {
    this.repository = dataSource.getRepository(BookingEntity);
  }

  async create(data: NewBooking): Promise<Booking> {
    const entityData = {
      tenantId: data.tenantId,
      clinicId: data.clinicId,
      originalProfessionalId: data.originalProfessionalId ?? null,
      professionalId: data.professionalId,
      coverageId: data.coverageId ?? null,
      patientId: data.patientId,
      source: data.source,
      status: data.status,
      paymentStatus: data.paymentStatus,
      holdId: data.holdId ?? null,
      holdExpiresAtUtc: data.holdExpiresAtUtc ?? null,
      startAtUtc: data.startAtUtc,
      endAtUtc: data.endAtUtc,
      timezone: data.timezone,
      lateToleranceMinutes: data.lateToleranceMinutes,
      recurrenceSeriesId: data.recurrenceSeriesId ?? null,
      cancellationReason: data.cancellationReason ?? null,
      pricingSplit: data.pricingSplit ?? null,
      preconditionsPassed: data.preconditionsPassed,
      anamneseRequired: data.anamneseRequired,
      anamneseOverrideReason: data.anamneseOverrideReason ?? null,
      noShowMarkedAtUtc: data.noShowMarkedAtUtc ?? null,
    } satisfies DeepPartial<BookingEntity>;

    const entity = this.repository.create(entityData);

    const saved = await this.repository.save(entity);
    return mapBookingEntityToDomain(saved);
  }

  async findById(tenantId: string, bookingId: string): Promise<Booking | null> {
    const entity = await this.repository.findOne({
      where: { tenantId, id: bookingId },
    });

    return entity ? mapBookingEntityToDomain(entity) : null;
  }

  async findByHold(tenantId: string, holdId: string): Promise<Booking | null> {
    const entity = await this.repository.findOne({
      where: { tenantId, holdId },
    });

    return entity ? mapBookingEntityToDomain(entity) : null;
  }

  async listByProfessionalAndRange(
    tenantId: string,
    professionalId: string,
    rangeStartUtc: Date,
    rangeEndUtc: Date,
  ): Promise<Booking[]> {
    const entities = await this.repository.find({
      where: {
        tenantId,
        professionalId,
        startAtUtc: Between(rangeStartUtc, rangeEndUtc),
      },
      order: { startAtUtc: 'ASC' },
    });

    return entities.map(mapBookingEntityToDomain);
  }

  async listByClinicAndRange(
    tenantId: string,
    clinicId: string,
    rangeStartUtc: Date,
    rangeEndUtc: Date,
  ): Promise<Booking[]> {
    const entities = await this.repository.find({
      where: {
        tenantId,
        clinicId,
        startAtUtc: Between(rangeStartUtc, rangeEndUtc),
      },
      order: { startAtUtc: 'ASC' },
    });

    return entities.map(mapBookingEntityToDomain);
  }

  async updateStatus(data: UpdateBookingStatusInput): Promise<Booking> {
    const { bookingId, tenantId, expectedVersion, status, paymentStatus, cancellationReason } =
      data;

    const updates: QueryDeepPartialEntity<BookingEntity> = {
      status,
      updatedAt: () => 'CURRENT_TIMESTAMP',
    };

    if (paymentStatus !== undefined) {
      updates.paymentStatus = paymentStatus;
    }

    if (cancellationReason !== undefined) {
      updates.cancellationReason = cancellationReason ?? null;
    }

    const result = await this.repository
      .createQueryBuilder()
      .update(BookingEntity)
      .set(updates)
      .where('id = :bookingId', { bookingId })
      .andWhere('tenant_id = :tenantId', { tenantId })
      .andWhere('version = :version', { version: expectedVersion })
      .returning('*')
      .execute();

    if (!result.affected) {
      this.logger.warn(`UpdateStatus concurrency conflict for booking ${bookingId}`);
      throw new ConflictException('Nao foi possivel atualizar o status do agendamento');
    }

    return this.loadBookingDomainOrThrow(tenantId, bookingId);
  }

  async reschedule(data: RescheduleBookingInput): Promise<Booking> {
    const { tenantId, bookingId, expectedVersion, newStartAtUtc, newEndAtUtc } = data;

    const result = await this.repository
      .createQueryBuilder()
      .update(BookingEntity)
      .set({
        startAtUtc: newStartAtUtc,
        endAtUtc: newEndAtUtc,
        updatedAt: () => 'CURRENT_TIMESTAMP',
      })
      .where('id = :bookingId', { bookingId })
      .andWhere('tenant_id = :tenantId', { tenantId })
      .andWhere('version = :version', { version: expectedVersion })
      .returning('*')
      .execute();

    if (!result.affected) {
      this.logger.warn(`Reschedule conflict for booking ${bookingId}`);
      throw new ConflictException('Nao foi possivel reagendar o compromisso');
    }

    return this.loadBookingDomainOrThrow(tenantId, bookingId);
  }

  async recordPaymentStatus(data: RecordPaymentStatusInput): Promise<Booking> {
    const { tenantId, bookingId, expectedVersion, paymentStatus } = data;

    const result = await this.repository
      .createQueryBuilder()
      .update(BookingEntity)
      .set({
        paymentStatus,
        updatedAt: () => 'CURRENT_TIMESTAMP',
      })
      .where('id = :bookingId', { bookingId })
      .andWhere('tenant_id = :tenantId', { tenantId })
      .andWhere('version = :version', { version: expectedVersion })
      .returning('*')
      .execute();

    if (!result.affected) {
      throw new ConflictException('Nao foi possivel atualizar status de pagamento');
    }

    return this.loadBookingDomainOrThrow(tenantId, bookingId);
  }

  async markNoShow(data: MarkNoShowInput): Promise<Booking> {
    const { tenantId, bookingId, expectedVersion, markedAtUtc } = data;

    const result = await this.repository
      .createQueryBuilder()
      .update(BookingEntity)
      .set({
        status: 'no_show',
        noShowMarkedAtUtc: markedAtUtc,
        updatedAt: () => 'CURRENT_TIMESTAMP',
      })
      .where('id = :bookingId', { bookingId })
      .andWhere('tenant_id = :tenantId', { tenantId })
      .andWhere('version = :version', { version: expectedVersion })
      .returning('*')
      .execute();

    if (!result.affected) {
      throw new ConflictException('Nao foi possivel marcar no-show do agendamento');
    }

    return this.loadBookingDomainOrThrow(tenantId, bookingId);
  }

  async reassignForCoverage(params: {
    tenantId: string;
    clinicId: string;
    originalProfessionalId: string;
    coverageProfessionalId: string;
    coverageId: string;
    startAtUtc: Date;
    endAtUtc: Date;
  }): Promise<Booking[]> {
    const entities = await this.repository
      .createQueryBuilder('booking')
      .where('booking.tenant_id = :tenantId', { tenantId: params.tenantId })
      .andWhere('booking.clinic_id = :clinicId', { clinicId: params.clinicId })
      .andWhere('booking.professional_id = :professionalId', {
        professionalId: params.originalProfessionalId,
      })
      .andWhere('booking.status IN (:...statuses)', { statuses: ['scheduled', 'confirmed'] })
      .andWhere('booking.start_at_utc < :endAt', { endAt: params.endAtUtc })
      .andWhere('booking.end_at_utc > :startAt', { startAt: params.startAtUtc })
      .getMany();

    const updated: Booking[] = [];

    for (const entity of entities) {
      if (entity.coverageId && entity.coverageId !== params.coverageId) {
        continue;
      }

      const alreadyAssigned =
        entity.coverageId === params.coverageId &&
        entity.professionalId === params.coverageProfessionalId;

      if (alreadyAssigned) {
        updated.push(mapBookingEntityToDomain(entity));
        continue;
      }

      entity.originalProfessionalId = entity.originalProfessionalId ?? entity.professionalId;
      entity.professionalId = params.coverageProfessionalId;
      entity.coverageId = params.coverageId;

      const saved = await this.repository.save(entity);
      updated.push(mapBookingEntityToDomain(saved));
    }

    return updated;
  }

  async releaseCoverageAssignments(params: {
    tenantId: string;
    clinicId: string;
    coverageId: string;
    referenceUtc: Date;
    originalProfessionalId: string;
    coverageProfessionalId: string;
  }): Promise<Booking[]> {
    const entities = await this.repository
      .createQueryBuilder('booking')
      .where('booking.tenant_id = :tenantId', { tenantId: params.tenantId })
      .andWhere('booking.clinic_id = :clinicId', { clinicId: params.clinicId })
      .andWhere('booking.coverage_id = :coverageId', { coverageId: params.coverageId })
      .andWhere('booking.status IN (:...statuses)', { statuses: ['scheduled', 'confirmed'] })
      .andWhere('booking.start_at_utc >= :reference', { reference: params.referenceUtc })
      .getMany();

    const updated: Booking[] = [];

    for (const entity of entities) {
      const fallbackProfessionalId = entity.originalProfessionalId ?? params.originalProfessionalId;

      if (!fallbackProfessionalId) {
        continue;
      }

      entity.professionalId = fallbackProfessionalId;
      entity.coverageId = null;

      const saved = await this.repository.save(entity);
      updated.push(mapBookingEntityToDomain(saved));
    }

    return updated;
  }

  private async loadBookingDomainOrThrow(tenantId: string, bookingId: string): Promise<Booking> {
    const entity = await this.repository.findOne({ where: { tenantId, id: bookingId } });

    if (!entity) {
      this.logger.error(`Booking ${bookingId} nao encontrado apos atualizacao persistente`);
      throw new ConflictException('Nao foi possivel recuperar o agendamento atualizado');
    }

    return mapBookingEntityToDomain(entity);
  }
}
