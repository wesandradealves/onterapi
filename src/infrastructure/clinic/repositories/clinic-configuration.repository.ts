import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  ApplyClinicConfigurationVersionInput,
  ClinicConfigurationSection,
  ClinicConfigurationVersion,
  SaveClinicConfigurationVersionInput,
} from '../../../domain/clinic/types/clinic.types';
import { IClinicConfigurationRepository } from '../../../domain/clinic/interfaces/repositories/clinic-configuration.repository.interface';
import { ClinicConfigurationVersionEntity } from '../entities/clinic-configuration-version.entity';
import { ClinicMapper } from '../mappers/clinic.mapper';

@Injectable()
export class ClinicConfigurationRepository implements IClinicConfigurationRepository {
  constructor(
    @InjectRepository(ClinicConfigurationVersionEntity)
    private readonly repository: Repository<ClinicConfigurationVersionEntity>,
  ) {}

  async findLatestAppliedVersion(
    clinicId: string,
    section: ClinicConfigurationSection,
  ): Promise<ClinicConfigurationVersion | null> {
    const entity = await this.repository
      .createQueryBuilder('version')
      .where('version.clinic_id = :clinicId', { clinicId })
      .andWhere('version.section = :section', { section })
      .andWhere('version.applied_at IS NOT NULL')
      .orderBy('version.applied_at', 'DESC')
      .addOrderBy('version.created_at', 'DESC')
      .getOne();

    return entity ? ClinicMapper.toConfigurationVersion(entity) : null;
  }

  async findVersionById(versionId: string): Promise<ClinicConfigurationVersion | null> {
    const entity = await this.repository.findOne({ where: { id: versionId } });
    return entity ? ClinicMapper.toConfigurationVersion(entity) : null;
  }

  async listVersions(params: {
    clinicId: string;
    section: ClinicConfigurationSection;
    limit?: number;
    beforeVersion?: number;
  }): Promise<ClinicConfigurationVersion[]> {
    const query = this.repository
      .createQueryBuilder('version')
      .where('version.clinic_id = :clinicId', { clinicId: params.clinicId })
      .andWhere('version.section = :section', { section: params.section })
      .orderBy('version.version', 'DESC');

    if (params.beforeVersion !== undefined) {
      query.andWhere('version.version < :beforeVersion', { beforeVersion: params.beforeVersion });
    }

    if (params.limit && params.limit > 0) {
      query.take(params.limit);
    }

    const entities = await query.getMany();
    return entities.map(ClinicMapper.toConfigurationVersion);
  }

  async createVersion(
    data: SaveClinicConfigurationVersionInput,
  ): Promise<ClinicConfigurationVersion> {
    const latest = await this.repository.findOne({
      where: { clinicId: data.clinicId, section: data.section },
      order: { version: 'DESC' },
    });

    const nextVersion = (latest?.version ?? 0) + 1;

    const entity = this.repository.create({
      clinicId: data.clinicId,
      tenantId: data.tenantId,
      section: data.section,
      version: nextVersion,
      payload: data.payload,
      notes: data.versionNotes ?? null,
      createdBy: data.createdBy,
      autoApply: data.autoApply ?? false,
    });

    const saved = await this.repository.save(entity);
    return ClinicMapper.toConfigurationVersion(saved);
  }

  async applyVersion(input: ApplyClinicConfigurationVersionInput): Promise<void> {
    await this.repository.update(
      {
        id: input.versionId,
        clinicId: input.clinicId,
        tenantId: input.tenantId,
      },
      {
        appliedAt: new Date(),
      },
    );
  }

  async deleteVersion(params: {
    clinicId: string;
    tenantId: string;
    versionId: string;
    requestedBy: string;
  }): Promise<void> {
    await this.repository.delete({
      id: params.versionId,
      clinicId: params.clinicId,
      tenantId: params.tenantId,
    });
  }
}
