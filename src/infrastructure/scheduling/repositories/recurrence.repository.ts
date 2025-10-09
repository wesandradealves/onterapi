import { ConflictException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import {
  CreateRecurrenceOccurrenceInput,
  CreateRecurrenceSeriesInput,
  IRecurrenceRepository,
  RecordOccurrenceRescheduleInput,
  RescheduleUsage,
  UpdateRecurrenceSeriesLimitsInput,
} from "../../../domain/scheduling/interfaces/repositories/recurrence.repository.interface";
import {
  RecurrenceOccurrence,
  RecurrenceSeries,
} from "../../../domain/scheduling/types/scheduling.types";
import {
  mapRecurrenceOccurrenceEntityToDomain,
  mapRecurrenceSeriesEntityToDomain,
} from "../../../shared/mappers/scheduling.mapper";
import { RecurrenceSeriesEntity } from "../entities/recurrence-series.entity";
import { RecurrenceOccurrenceEntity } from "../entities/recurrence-occurrence.entity";

@Injectable()
export class RecurrenceRepository implements IRecurrenceRepository {
  constructor(
    @InjectRepository(RecurrenceSeriesEntity)
    private readonly seriesRepository: Repository<RecurrenceSeriesEntity>,
    @InjectRepository(RecurrenceOccurrenceEntity)
    private readonly occurrenceRepository: Repository<RecurrenceOccurrenceEntity>,
  ) {}

  async createSeries(data: CreateRecurrenceSeriesInput): Promise<RecurrenceSeries> {
    const entity = this.seriesRepository.create({
      tenantId: data.tenantId,
      professionalId: data.professionalId,
      clinicId: data.clinicId,
      pattern: data.pattern,
      patternValue: data.patternValue,
      startDateUtc: data.startDateUtc,
      endDateUtc: data.endDateUtc ?? null,
      skipHolidays: data.skipHolidays,
      holiday_policy: data.holidayPolicy,
      maxReschedulesPerOccurrence: data.limits.maxReschedulesPerOccurrence,
      maxReschedulesPerSeries: data.limits.maxReschedulesPerSeries,\n    });

    const saved = await this.seriesRepository.save(entity);
    return mapRecurrenceSeriesEntityToDomain(saved);
  }

  async updateSeriesLimits(data: UpdateRecurrenceSeriesLimitsInput): Promise<RecurrenceSeries> {
    const { tenantId, seriesId, maxReschedulesPerOccurrence, maxReschedulesPerSeries } = data;

    const result = await this.seriesRepository
      .createQueryBuilder()
      .update(RecurrenceSeriesEntity)
      .set({
        maxReschedulesPerOccurrence,
        maxReschedulesPerSeries,
      })
      .where('id = :seriesId', { seriesId })
      .andWhere('tenant_id = :tenantId', { tenantId })
      .returning('*')
      .execute();

    if (!result.affected) {
      throw new ConflictException('Nao foi possivel atualizar limites de recorrencia');
    }

    return mapRecurrenceSeriesEntityToDomain(result.raw[0] as RecurrenceSeriesEntity);
  }

  async findSeriesById(tenantId: string, seriesId: string): Promise<RecurrenceSeries | null> {
    const entity = await this.seriesRepository.findOne({ where: { tenantId, id: seriesId } });
    return entity ? mapRecurrenceSeriesEntityToDomain(entity) : null;
  }

  async listSeriesForProfessional(tenantId: string, professionalId: string): Promise<RecurrenceSeries[]> {
    const entities = await this.seriesRepository.find({
      where: { tenantId, professionalId },
      order: { createdAt: 'DESC' },
    });

    return entities.map(mapRecurrenceSeriesEntityToDomain);
  }

  async createOccurrence(data: CreateRecurrenceOccurrenceInput): Promise<RecurrenceOccurrence> {
    const entity = this.occurrenceRepository.create({
      tenantId: data.tenantId,
      seriesId: data.seriesId,
      bookingId: data.bookingId,
      startAtUtc: data.startAtUtc,
      endAtUtc: data.endAtUtc,
    });

    const saved = await this.occurrenceRepository.save(entity);
    return mapRecurrenceOccurrenceEntityToDomain(saved);
  }

  async findOccurrenceByBooking(
    tenantId: string,
    bookingId: string,
  ): Promise<RecurrenceOccurrence | null> {
    const entity = await this.occurrenceRepository.findOne({ where: { tenantId, bookingId } });
    return entity ? mapRecurrenceOccurrenceEntityToDomain(entity) : null;
  }

  async recordOccurrenceReschedule(
    data: RecordOccurrenceRescheduleInput,
  ): Promise<RecurrenceOccurrence> {
    const { tenantId, occurrenceId, incrementBy } = data;

    const result = await this.occurrenceRepository
      .createQueryBuilder()
      .update(RecurrenceOccurrenceEntity)
      .set({ reschedulesCount: () => '"reschedules_count" + :increment' })
      .where('id = :occurrenceId', { occurrenceId })
      .andWhere('tenant_id = :tenantId', { tenantId })
      .setParameters({ increment: Math.abs(incrementBy) })
      .returning('*')
      .execute();

    if (!result.affected) {
      throw new ConflictException('Nao foi possivel registrar reagendamento da ocorrencia');
    }

    return mapRecurrenceOccurrenceEntityToDomain(result.raw[0] as RecurrenceOccurrenceEntity);
  }

  async getRescheduleUsage(
    tenantId: string,
    seriesId: string,
    occurrenceId: string,
  ): Promise<RescheduleUsage> {
    const occurrence = await this.occurrenceRepository.findOne({
      where: { tenantId, id: occurrenceId, seriesId },
    });

    if (!occurrence) {
      return { occurrenceReschedules: 0, seriesReschedules: 0 };
    }

    const totalForSeries = await this.occurrenceRepository
      .createQueryBuilder('occurrence')
      .select('SUM(occurrence.reschedules_count)', 'total')
      .where('occurrence.tenant_id = :tenantId', { tenantId })
      .andWhere('occurrence.series_id = :seriesId', { seriesId })
      .getRawOne<{ total: string | null }>();

    return {
      occurrenceReschedules: occurrence.reschedulesCount,
      seriesReschedules: totalForSeries?.total ? Number(totalForSeries.total) : 0,
    };
  }
}

