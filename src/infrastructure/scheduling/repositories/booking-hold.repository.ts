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
      professionalId: data.professionalId,
      clinicId: data.clinicId,
      patientId: data.patientId,
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
}
