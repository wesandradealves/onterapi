import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';

import {
  CancelClinicProfessionalCoverageInput,
  ClinicProfessionalCoverage,
  ClinicProfessionalCoverageClinicSummary,
  ClinicProfessionalCoverageStatus,
  CreateClinicProfessionalCoverageInput,
  ListClinicProfessionalCoveragesQuery,
} from '../../../domain/clinic/types/clinic.types';
import { IClinicProfessionalCoverageRepository } from '../../../domain/clinic/interfaces/repositories/clinic-professional-coverage.repository.interface';
import { ClinicProfessionalCoverageEntity } from '../entities/clinic-professional-coverage.entity';
import { ClinicMapper } from '../mappers/clinic.mapper';

const ACTIVE_COVERAGE_STATUSES: ClinicProfessionalCoverageStatus[] = ['scheduled', 'active'];

@Injectable()
export class ClinicProfessionalCoverageRepository implements IClinicProfessionalCoverageRepository {
  constructor(
    @InjectRepository(ClinicProfessionalCoverageEntity)
    private readonly repository: Repository<ClinicProfessionalCoverageEntity>,
  ) {}

  async create(input: CreateClinicProfessionalCoverageInput): Promise<ClinicProfessionalCoverage> {
    const entity = this.repository.create({
      tenantId: input.tenantId,
      clinicId: input.clinicId,
      professionalId: input.professionalId,
      coverageProfessionalId: input.coverageProfessionalId,
      startAt: input.startAt,
      endAt: input.endAt,
      status: 'scheduled',
      reason: input.reason ?? null,
      notes: input.notes ?? null,
      metadata: input.metadata ?? {},
      createdBy: input.performedBy,
      updatedBy: input.performedBy,
    });

    const saved = await this.repository.save(entity);
    return ClinicMapper.toProfessionalCoverage(saved);
  }

  async cancel(
    input: CancelClinicProfessionalCoverageInput,
  ): Promise<ClinicProfessionalCoverage | null> {
    const entity = await this.repository.findOne({
      where: {
        id: input.coverageId,
        clinicId: input.clinicId,
        tenantId: input.tenantId,
      },
    });

    if (!entity) {
      return null;
    }

    entity.status = 'cancelled';
    entity.cancelledAt = new Date();
    entity.cancelledBy = input.cancelledBy;
    entity.updatedBy = input.cancelledBy;
    entity.reason = input.cancellationReason ?? entity.reason ?? null;

    const saved = await this.repository.save(entity);
    return ClinicMapper.toProfessionalCoverage(saved);
  }

  async findById(params: {
    tenantId: string;
    clinicId: string;
    coverageId: string;
  }): Promise<ClinicProfessionalCoverage | null> {
    const entity = await this.repository.findOne({
      where: {
        id: params.coverageId,
        clinicId: params.clinicId,
        tenantId: params.tenantId,
      },
    });

    return entity ? ClinicMapper.toProfessionalCoverage(entity) : null;
  }

  async findActiveOverlapping(params: {
    tenantId: string;
    clinicId: string;
    professionalId: string;
    coverageProfessionalId?: string;
    startAt: Date;
    endAt: Date;
    excludeCoverageId?: string;
  }): Promise<ClinicProfessionalCoverage[]> {
    const query = this.repository
      .createQueryBuilder('coverage')
      .where('coverage.tenant_id = :tenantId', { tenantId: params.tenantId })
      .andWhere('coverage.clinic_id = :clinicId', { clinicId: params.clinicId })
      .andWhere('coverage.status IN (:...statuses)', { statuses: ACTIVE_COVERAGE_STATUSES })
      .andWhere('coverage.start_at < :endAt', { endAt: params.endAt })
      .andWhere('coverage.end_at > :startAt', { startAt: params.startAt })
      .andWhere(
        new Brackets((qb) => {
          qb.where('coverage.professional_id = :professionalId', {
            professionalId: params.professionalId,
          });
          if (params.coverageProfessionalId) {
            qb.orWhere('coverage.coverage_professional_id = :coverageProfessionalId', {
              coverageProfessionalId: params.coverageProfessionalId,
            });
          }
        }),
      );

    if (params.excludeCoverageId) {
      query.andWhere('coverage.id <> :excludeCoverageId', {
        excludeCoverageId: params.excludeCoverageId,
      });
    }

    const entities = await query.getMany();
    return entities.map((entity) => ClinicMapper.toProfessionalCoverage(entity));
  }

  async findScheduledToActivate(params: {
    reference: Date;
    limit?: number;
  }): Promise<ClinicProfessionalCoverage[]> {
    const limit = params.limit && params.limit > 0 ? Math.min(Math.floor(params.limit), 200) : 50;

    const entities = await this.repository
      .createQueryBuilder('coverage')
      .where('coverage.status = :scheduled', { scheduled: 'scheduled' })
      .andWhere('coverage.start_at <= :startReference', { startReference: params.reference })
      .andWhere('coverage.end_at > :endReference', { endReference: params.reference })
      .orderBy('coverage.start_at', 'ASC')
      .take(limit)
      .getMany();

    return entities.map((entity) => ClinicMapper.toProfessionalCoverage(entity));
  }

  async findDueToComplete(params: {
    reference: Date;
    limit?: number;
  }): Promise<ClinicProfessionalCoverage[]> {
    const limit = params.limit && params.limit > 0 ? Math.min(Math.floor(params.limit), 200) : 50;

    const entities = await this.repository
      .createQueryBuilder('coverage')
      .where('coverage.status IN (:...statuses)', { statuses: ['scheduled', 'active'] })
      .andWhere('coverage.end_at <= :completionReference', {
        completionReference: params.reference,
      })
      .orderBy('coverage.end_at', 'ASC')
      .take(limit)
      .getMany();

    return entities.map((entity) => ClinicMapper.toProfessionalCoverage(entity));
  }

  async list(query: ListClinicProfessionalCoveragesQuery): Promise<{
    data: ClinicProfessionalCoverage[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 200) : 25;
    const skip = (page - 1) * limit;

    const builder = this.repository
      .createQueryBuilder('coverage')
      .where('coverage.tenant_id = :tenantId', { tenantId: query.tenantId });

    if (query.clinicIds && query.clinicIds.length > 0) {
      builder.andWhere('coverage.clinic_id IN (:...clinicIds)', { clinicIds: query.clinicIds });
    } else if (query.clinicId) {
      builder.andWhere('coverage.clinic_id = :clinicId', { clinicId: query.clinicId });
    }

    if (query.professionalId) {
      builder.andWhere('coverage.professional_id = :professionalId', {
        professionalId: query.professionalId,
      });
    }

    if (query.coverageProfessionalId) {
      builder.andWhere('coverage.coverage_professional_id = :coverageProfessionalId', {
        coverageProfessionalId: query.coverageProfessionalId,
      });
    }

    if (query.statuses && query.statuses.length > 0) {
      builder.andWhere('coverage.status IN (:...statuses)', { statuses: query.statuses });
    } else if (!query.includeCancelled) {
      builder.andWhere('coverage.status <> :cancelledStatus', { cancelledStatus: 'cancelled' });
    }

    if (query.from) {
      builder.andWhere('coverage.end_at >= :from', { from: query.from });
    }

    if (query.to) {
      builder.andWhere('coverage.start_at <= :to', { to: query.to });
    }

    builder.orderBy('coverage.start_at', 'ASC');

    const [entities, total] = await builder.skip(skip).take(limit).getManyAndCount();

    return {
      data: entities.map((entity) => ClinicMapper.toProfessionalCoverage(entity)),
      total,
      page,
      limit,
    };
  }

  async updateStatus(params: {
    tenantId: string;
    clinicId: string;
    coverageId: string;
    status: ClinicProfessionalCoverageStatus;
    updatedBy: string;
  }): Promise<void> {
    await this.repository.update(
      {
        id: params.coverageId,
        clinicId: params.clinicId,
        tenantId: params.tenantId,
      },
      {
        status: params.status,
        updatedBy: params.updatedBy,
      },
    );
  }

  async getClinicCoverageSummaries(params: {
    tenantId: string;
    clinicIds: string[];
    reference?: Date;
    completedWindowDays?: number;
  }): Promise<ClinicProfessionalCoverageClinicSummary[]> {
    const uniqueClinicIds = Array.from(
      new Set(
        (params.clinicIds ?? [])
          .map((id) => id?.trim())
          .filter((id): id is string => typeof id === 'string' && id.length > 0),
      ),
    );

    if (uniqueClinicIds.length === 0) {
      return [];
    }

    const reference = params.reference ?? new Date();
    const windowDays =
      params.completedWindowDays && params.completedWindowDays > 0
        ? params.completedWindowDays
        : 30;
    const completedThreshold = new Date(reference.getTime() - windowDays * 24 * 60 * 60 * 1000);

    const rows = await this.repository
      .createQueryBuilder('coverage')
      .select('coverage.clinic_id', 'clinicId')
      .addSelect(
        `SUM(CASE WHEN coverage.status = 'scheduled' AND coverage.start_at > :reference THEN 1 ELSE 0 END)`,
        'scheduled',
      )
      .addSelect(
        `SUM(CASE WHEN coverage.status = 'active' AND coverage.start_at <= :reference AND coverage.end_at > :reference THEN 1 ELSE 0 END)`,
        'active',
      )
      .addSelect(
        `SUM(CASE WHEN coverage.status = 'completed' AND coverage.updated_at >= :completedThreshold THEN 1 ELSE 0 END)`,
        'completed',
      )
      .addSelect('MAX(coverage.updated_at)', 'lastUpdatedAt')
      .where('coverage.tenant_id = :tenantId', { tenantId: params.tenantId })
      .andWhere('coverage.clinic_id IN (:...clinicIds)', { clinicIds: uniqueClinicIds })
      .groupBy('coverage.clinic_id')
      .setParameters({ reference, completedThreshold })
      .getRawMany<{
        clinicId: string;
        scheduled: string | number | null;
        active: string | number | null;
        completed: string | number | null;
        lastUpdatedAt: Date | string | null;
      }>();

    const parseCount = (value: string | number | null | undefined): number => {
      if (value === null || value === undefined) {
        return 0;
      }
      const parsed = typeof value === 'number' ? value : Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    return rows.map((row) => ({
      clinicId: row.clinicId,
      scheduled: parseCount(row.scheduled),
      active: parseCount(row.active),
      completedLast30Days: parseCount(row.completed),
      lastUpdatedAt: row.lastUpdatedAt ? new Date(row.lastUpdatedAt) : undefined,
    }));
  }
}
