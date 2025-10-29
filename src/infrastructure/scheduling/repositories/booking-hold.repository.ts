import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import {
  BookingHold,
  CreateHoldInput,
  UpdateHoldStatusInput,
} from '../../../domain/scheduling/types/scheduling.types';
import { IBookingHoldRepository } from '../../../domain/scheduling/interfaces/repositories/booking-hold.repository.interface';
import { BookingHoldEntity } from '../entities/booking-hold.entity';
import { mapBookingHoldEntityToDomain } from '../../../shared/mappers/scheduling.mapper';

@Injectable()
export class BookingHoldRepository implements IBookingHoldRepository {
  private readonly logger = new Logger(BookingHoldRepository.name);
  private readonly repository: Repository<BookingHoldEntity>;

  constructor(@InjectDataSource() dataSource: DataSource) {
    this.repository = dataSource.getRepository(BookingHoldEntity);
  }

  async create(data: CreateHoldInput): Promise<BookingHold> {
    const entity = this.repository.create({
      tenantId: data.tenantId,
      originalProfessionalId: data.originalProfessionalId ?? null,
      professionalId: data.professionalId,
      coverageId: data.coverageId ?? null,
      clinicId: data.clinicId,
      patientId: data.patientId,
      serviceTypeId: data.serviceTypeId ?? null,
      startAtUtc: data.startAtUtc,
      endAtUtc: data.endAtUtc,
      ttlExpiresAtUtc: data.ttlExpiresAtUtc,
      status: 'active',
    });

    const saved = await this.repository.save(entity);
    return mapBookingHoldEntityToDomain(saved);
  }

  async findById(tenantId: string, holdId: string): Promise<BookingHold | null> {
    const entity = await this.repository.findOne({ where: { tenantId, id: holdId } });
    return entity ? mapBookingHoldEntityToDomain(entity) : null;
  }

  async findActiveOverlap(
    tenantId: string,
    professionalId: string,
    startAtUtc: Date,
    endAtUtc: Date,
  ): Promise<BookingHold[]> {
    const entities = await this.repository
      .createQueryBuilder('hold')
      .where('hold.tenant_id = :tenantId', { tenantId })
      .andWhere('hold.professional_id = :professionalId', { professionalId })
      .andWhere('hold.status = :status', { status: 'active' })
      .andWhere('hold.ttl_expires_at_utc > :now', { now: new Date() })
      .andWhere('hold.start_at_utc < :endAtUtc', { endAtUtc })
      .andWhere('hold.end_at_utc > :startAtUtc', { startAtUtc })
      .getMany();

    return entities.map(mapBookingHoldEntityToDomain);
  }

  async listExpiringBefore(tenantId: string, referenceUtc: Date): Promise<BookingHold[]> {
    const entities = await this.repository
      .createQueryBuilder('hold')
      .where('hold.tenant_id = :tenantId', { tenantId })
      .andWhere('hold.status = :status', { status: 'active' })
      .andWhere('hold.ttl_expires_at_utc <= :reference', { reference: referenceUtc })
      .orderBy('hold.ttl_expires_at_utc', 'ASC')
      .getMany();

    return entities.map(mapBookingHoldEntityToDomain);
  }

  async updateStatus(data: UpdateHoldStatusInput): Promise<BookingHold> {
    const { tenantId, holdId, expectedVersion, status } = data;

    const result = await this.repository
      .createQueryBuilder()
      .update(BookingHoldEntity)
      .set({ status })
      .where('id = :holdId', { holdId })
      .andWhere('tenant_id = :tenantId', { tenantId })
      .andWhere('version = :version', { version: expectedVersion })
      .returning('*')
      .execute();

    if (!result.affected) {
      this.logger.warn(`Conflict updating booking hold ${holdId}`);
      throw new ConflictException('Nao foi possivel atualizar o status do hold');
    }

    return mapBookingHoldEntityToDomain(result.raw[0] as BookingHoldEntity);
  }

  async reassignForCoverage(params: {
    tenantId: string;
    clinicId: string;
    originalProfessionalId: string;
    coverageProfessionalId: string;
    coverageId: string;
    startAtUtc: Date;
    endAtUtc: Date;
  }): Promise<BookingHold[]> {
    const entities = await this.repository
      .createQueryBuilder('hold')
      .where('hold.tenant_id = :tenantId', { tenantId: params.tenantId })
      .andWhere('hold.clinic_id = :clinicId', { clinicId: params.clinicId })
      .andWhere('hold.professional_id = :professionalId', {
        professionalId: params.originalProfessionalId,
      })
      .andWhere('hold.status = :status', { status: 'active' })
      .andWhere('hold.start_at_utc < :endAt', { endAt: params.endAtUtc })
      .andWhere('hold.end_at_utc > :startAt', { startAt: params.startAtUtc })
      .getMany();

    const updated: BookingHold[] = [];

    for (const entity of entities) {
      if (entity.coverageId && entity.coverageId !== params.coverageId) {
        continue;
      }

      const alreadyAssigned =
        entity.coverageId === params.coverageId &&
        entity.professionalId === params.coverageProfessionalId;

      if (alreadyAssigned) {
        updated.push(mapBookingHoldEntityToDomain(entity));
        continue;
      }

      entity.originalProfessionalId = entity.originalProfessionalId ?? entity.professionalId;
      entity.professionalId = params.coverageProfessionalId;
      entity.coverageId = params.coverageId;

      const saved = await this.repository.save(entity);
      updated.push(mapBookingHoldEntityToDomain(saved));
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
  }): Promise<BookingHold[]> {
    const entities = await this.repository
      .createQueryBuilder('hold')
      .where('hold.tenant_id = :tenantId', { tenantId: params.tenantId })
      .andWhere('hold.clinic_id = :clinicId', { clinicId: params.clinicId })
      .andWhere('hold.coverage_id = :coverageId', { coverageId: params.coverageId })
      .andWhere('hold.status = :status', { status: 'active' })
      .andWhere('hold.start_at_utc >= :reference', { reference: params.referenceUtc })
      .getMany();

    const updated: BookingHold[] = [];

    for (const entity of entities) {
      const fallbackProfessionalId = entity.originalProfessionalId ?? params.originalProfessionalId;

      if (!fallbackProfessionalId) {
        continue;
      }

      entity.professionalId = fallbackProfessionalId;
      entity.coverageId = null;

      const saved = await this.repository.save(entity);
      updated.push(mapBookingHoldEntityToDomain(saved));
    }

    return updated;
  }
}
