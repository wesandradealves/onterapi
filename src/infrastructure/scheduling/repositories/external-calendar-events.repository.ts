import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ExternalCalendarEvent } from '../../../domain/scheduling/types/scheduling.types';
import {
  IExternalCalendarEventsRepository,
  UpdateExternalCalendarEventStatusInput,
  UpsertExternalCalendarEventInput,
} from '../../../domain/scheduling/interfaces/repositories/external-calendar-events.repository.interface';
import { ExternalCalendarEventEntity } from '../entities/external-calendar-event.entity';
import { mapExternalCalendarEventEntityToDomain } from '../../../shared/mappers/scheduling.mapper';

@Injectable()
export class ExternalCalendarEventsRepository implements IExternalCalendarEventsRepository {
  constructor(
    @InjectRepository(ExternalCalendarEventEntity)
    private readonly repository: Repository<ExternalCalendarEventEntity>,
  ) {}

  async upsert(data: UpsertExternalCalendarEventInput): Promise<ExternalCalendarEvent> {
    const entity = this.repository.create({
      id: data.id,
      tenantId: data.tenantId,
      professionalId: data.professionalId,
      source: data.source,
      externalId: data.externalId,
      startAtUtc: data.startAtUtc,
      endAtUtc: data.endAtUtc,
      timezone: data.timezone,
      status: data.status,
      validationErrors: data.validationErrors ?? null,
      resourceId: data.resourceId ?? null,
    });

    const saved = await this.repository.save(entity);
    return mapExternalCalendarEventEntityToDomain(saved);
  }

  async findByExternalId(
    tenantId: string,
    professionalId: string,
    externalId: string,
  ): Promise<ExternalCalendarEvent | null> {
    const entity = await this.repository.findOne({
      where: { tenantId, professionalId, externalId },
    });
    return entity ? mapExternalCalendarEventEntityToDomain(entity) : null;
  }

  async listPendingByProfessional(
    tenantId: string,
    professionalId: string,
  ): Promise<ExternalCalendarEvent[]> {
    const entities = await this.repository.find({
      where: { tenantId, professionalId, status: 'pending' },
      order: { createdAt: 'ASC' },
    });

    return entities.map(mapExternalCalendarEventEntityToDomain);
  }

  async updateStatus(data: UpdateExternalCalendarEventStatusInput): Promise<ExternalCalendarEvent> {
    const { tenantId, eventId, status, validationErrors } = data;

    const result = await this.repository
      .createQueryBuilder()
      .update(ExternalCalendarEventEntity)
      .set({ status, validationErrors: validationErrors ?? null })
      .where('id = :eventId', { eventId })
      .andWhere('tenant_id = :tenantId', { tenantId })
      .returning('*')
      .execute();

    if (!result.affected) {
      throw new Error('Nao foi possivel atualizar status do evento externo');
    }

    return mapExternalCalendarEventEntityToDomain(result.raw[0] as ExternalCalendarEventEntity);
  }
}
