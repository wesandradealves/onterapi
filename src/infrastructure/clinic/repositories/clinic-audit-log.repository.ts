import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';

import {
  IClinicAuditLogRepository,
  IClinicAuditLogRepository as IClinicAuditLogRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-audit-log.repository.interface';
import {
  ClinicAuditLog,
  CreateClinicAuditLogInput,
  ListClinicAuditLogsInput,
} from '../../../domain/clinic/types/clinic.types';
import { ClinicAuditLogEntity } from '../entities/clinic-audit-log.entity';

@Injectable()
export class ClinicAuditLogRepository implements IClinicAuditLogRepository {
  constructor(
    @InjectRepository(ClinicAuditLogEntity)
    private readonly repository: Repository<ClinicAuditLogEntity>,
  ) {}

  async create(log: CreateClinicAuditLogInput): Promise<ClinicAuditLog> {
    const entity = this.repository.create({
      tenantId: log.tenantId,
      clinicId: log.clinicId ?? null,
      event: log.event,
      performedBy: log.performedBy ?? null,
      detail: log.detail ?? {},
    });

    const saved = await this.repository.save(entity);
    return ClinicAuditLogEntity.toDomain(saved);
  }

  async list(input: ListClinicAuditLogsInput): Promise<{ data: ClinicAuditLog[]; total: number }> {
    const qb = this.repository
      .createQueryBuilder('log')
      .where('log.tenant_id = :tenantId', { tenantId: input.tenantId });

    if (input.clinicId) {
      qb.andWhere('log.clinic_id = :clinicId', { clinicId: input.clinicId });
    }

    if (input.events && input.events.length > 0) {
      qb.andWhere('log.event IN (:...events)', { events: input.events });
    }

    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? Math.min(input.limit, 100) : 20;

    qb.orderBy('log.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [entities, total] = await qb.getManyAndCount();

    return {
      data: entities.map((entity) => ClinicAuditLogEntity.toDomain(entity)),
      total,
    };
  }
}

export const ClinicAuditLogRepositoryToken = IClinicAuditLogRepositoryToken;
