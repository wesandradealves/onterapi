import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  Clinic,
  ClinicConfigurationSection,
  ClinicStatus,
  CreateClinicInput,
  UpdateClinicHoldSettingsInput,
} from '../../../domain/clinic/types/clinic.types';
import { IClinicRepository } from '../../../domain/clinic/interfaces/repositories/clinic.repository.interface';
import { ClinicEntity } from '../entities/clinic.entity';
import { ClinicMapper } from '../mappers/clinic.mapper';

interface ListParams {
  tenantId: string;
  status?: ClinicStatus[];
  search?: string;
  page?: number;
  limit?: number;
  includeDeleted?: boolean;
}

@Injectable()
export class ClinicRepository implements IClinicRepository {
  constructor(
    @InjectRepository(ClinicEntity)
    private readonly repository: Repository<ClinicEntity>,
  ) {}

  async create(data: CreateClinicInput): Promise<Clinic> {
    const entity = this.repository.create({
      tenantId: data.tenantId,
      name: data.name,
      slug: data.slug,
      status: 'draft',
      documentType: data.document?.type ?? null,
      documentValue: data.document?.value ?? null,
      primaryOwnerId: data.primaryOwnerId,
      holdSettings: data.holdSettings ?? null,
      metadata: data.metadata ?? {},
    });

    const saved = await this.repository.save(entity);
    return ClinicMapper.toClinic(saved);
  }

  async findById(clinicId: string): Promise<Clinic | null> {
    const entity = await this.repository.findOne({ where: { id: clinicId } });
    return entity ? ClinicMapper.toClinic(entity) : null;
  }

  async findByTenant(tenantId: string, clinicId: string): Promise<Clinic | null> {
    const entity = await this.repository.findOne({
      where: { id: clinicId, tenantId },
    });
    return entity ? ClinicMapper.toClinic(entity) : null;
  }

  async findBySlug(tenantId: string, slug: string): Promise<Clinic | null> {
    const entity = await this.repository.findOne({
      where: { tenantId, slug },
    });
    return entity ? ClinicMapper.toClinic(entity) : null;
  }

  async list(params: ListParams): Promise<{ data: Clinic[]; total: number }> {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 25;
    const offset = (page - 1) * limit;

    const queryBuilder = this.repository
      .createQueryBuilder('clinic')
      .where('clinic.tenant_id = :tenantId', { tenantId: params.tenantId });

    if (params.status && params.status.length > 0) {
      queryBuilder.andWhere('clinic.status IN (:...status)', { status: params.status });
    }

    if (params.search) {
      const searchTerm = `%${params.search.trim()}%`;
      queryBuilder.andWhere('(clinic.name ILIKE :search OR clinic.slug ILIKE :search)', {
        search: searchTerm,
      });
    }

    if (params.includeDeleted) {
      queryBuilder.withDeleted();
    }

    const [entities, total] = await queryBuilder
      .orderBy('clinic.created_at', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return {
      data: entities.map(ClinicMapper.toClinic),
      total,
    };
  }

  async updateHoldSettings(input: UpdateClinicHoldSettingsInput): Promise<Clinic> {
    const entity = await this.repository.findOne({
      where: { id: input.clinicId, tenantId: input.tenantId },
    });

    if (!entity) {
      throw new Error('Clinic not found');
    }

    entity.holdSettings = input.holdSettings;
    const saved = await this.repository.save(entity);
    return ClinicMapper.toClinic(saved);
  }

  async updateStatus(params: {
    clinicId: string;
    tenantId: string;
    status: ClinicStatus;
    updatedBy: string;
  }): Promise<Clinic> {
    const entity = await this.repository.findOne({
      where: { id: params.clinicId, tenantId: params.tenantId },
    });

    if (!entity) {
      throw new Error('Clinic not found');
    }

    entity.status = params.status;
    const saved = await this.repository.save(entity);
    return ClinicMapper.toClinic(saved);
  }

  async updatePrimaryOwner(params: {
    clinicId: string;
    tenantId: string;
    newOwnerId: string;
    updatedBy: string;
  }): Promise<Clinic> {
    const entity = await this.repository.findOne({
      where: { id: params.clinicId, tenantId: params.tenantId },
    });

    if (!entity) {
      throw new Error('Clinic not found');
    }

    entity.primaryOwnerId = params.newOwnerId;
    const saved = await this.repository.save(entity);
    return ClinicMapper.toClinic(saved);
  }

  async setCurrentConfigurationVersion(params: {
    clinicId: string;
    tenantId: string;
    section: ClinicConfigurationSection;
    versionId: string;
    updatedBy: string;
  }): Promise<void> {
    const entity = await this.repository.findOne({
      where: { id: params.clinicId, tenantId: params.tenantId },
    });

    if (!entity) {
      throw new Error('Clinic not found');
    }

    const current = entity.configurationVersions ?? {};
    const next = { ...current, [params.section]: params.versionId };
    entity.configurationVersions = next;
    await this.repository.save(entity);
  }

  async existsByDocument(
    tenantId: string,
    documentValue: string,
    excludeClinicId?: string,
  ): Promise<boolean> {
    const entity = await this.repository.findOne({
      where: { tenantId, documentValue },
      withDeleted: true,
    });

    if (!entity) {
      return false;
    }

    if (excludeClinicId && entity.id === excludeClinicId) {
      return false;
    }

    return true;
  }
}
