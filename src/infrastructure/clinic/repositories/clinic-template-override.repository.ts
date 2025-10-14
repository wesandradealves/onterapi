import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import {
  ClinicConfigurationSection,
  ClinicTemplateOverride,
  CreateClinicTemplateOverrideInput,
  FindClinicTemplateOverrideParams,
  SupersedeClinicTemplateOverrideInput,
  UpdateClinicTemplateOverrideAppliedInput,
  UpdateClinicTemplateOverrideBaseVersionInput,
} from '../../../domain/clinic/types/clinic.types';
import { IClinicTemplateOverrideRepository } from '../../../domain/clinic/interfaces/repositories/clinic-template-override.repository.interface';
import { ClinicTemplateOverrideEntity } from '../entities/clinic-template-override.entity';
import { ClinicMapper } from '../mappers/clinic.mapper';

@Injectable()
export class ClinicTemplateOverrideRepository implements IClinicTemplateOverrideRepository {
  constructor(
    @InjectRepository(ClinicTemplateOverrideEntity)
    private readonly repository: Repository<ClinicTemplateOverrideEntity>,
  ) {}

  async findActive(
    params: FindClinicTemplateOverrideParams,
  ): Promise<ClinicTemplateOverride | null> {
    const entity = await this.repository.findOne({
      where: {
        clinicId: params.clinicId,
        tenantId: params.tenantId,
        section: params.section,
        supersededAt: IsNull(),
      },
      order: {
        overrideVersion: 'DESC',
      },
    });

    return entity ? ClinicMapper.toTemplateOverride(entity) : null;
  }

  async findLatest(
    params: FindClinicTemplateOverrideParams,
  ): Promise<ClinicTemplateOverride | null> {
    const entity = await this.repository.findOne({
      where: {
        clinicId: params.clinicId,
        tenantId: params.tenantId,
        section: params.section,
      },
      order: {
        overrideVersion: 'DESC',
      },
    });

    return entity ? ClinicMapper.toTemplateOverride(entity) : null;
  }

  async create(data: CreateClinicTemplateOverrideInput): Promise<ClinicTemplateOverride> {
    const latest = await this.repository.findOne({
      where: {
        clinicId: data.clinicId,
        section: data.section,
      },
      order: { overrideVersion: 'DESC' },
    });

    const nextVersion = (latest?.overrideVersion ?? 0) + 1;

    const entity = this.repository.create({
      clinicId: data.clinicId,
      tenantId: data.tenantId,
      templateClinicId: data.templateClinicId,
      section: data.section,
      overrideVersion: nextVersion,
      overridePayload: data.overridePayload,
      overrideHash: data.overrideHash,
      baseTemplateVersionId: data.baseTemplateVersionId,
      baseTemplateVersionNumber: data.baseTemplateVersionNumber,
      createdBy: data.createdBy,
    });

    const saved = await this.repository.save(entity);
    return ClinicMapper.toTemplateOverride(saved);
  }

  async supersede(params: SupersedeClinicTemplateOverrideInput): Promise<void> {
    await this.repository.update(
      { id: params.overrideId },
      {
        supersededAt: params.supersededAt ?? new Date(),
        supersededBy: params.supersededBy,
      },
    );
  }

  async supersedeBySection(params: {
    clinicId: string;
    tenantId: string;
    section: ClinicConfigurationSection;
    supersededBy: string;
    supersededAt?: Date;
  }): Promise<void> {
    await this.repository.update(
      {
        clinicId: params.clinicId,
        tenantId: params.tenantId,
        section: params.section,
        supersededAt: IsNull(),
      },
      {
        supersededAt: params.supersededAt ?? new Date(),
        supersededBy: params.supersededBy,
      },
    );
  }

  async updateAppliedVersion(
    params: UpdateClinicTemplateOverrideAppliedInput,
  ): Promise<ClinicTemplateOverride | null> {
    await this.repository.update(
      { id: params.overrideId },
      {
        appliedConfigurationVersionId: params.appliedConfigurationVersionId,
        updatedAt: params.appliedAt,
      },
    );

    const entity = await this.repository.findOne({ where: { id: params.overrideId } });
    return entity ? ClinicMapper.toTemplateOverride(entity) : null;
  }

  async updateBaseTemplateVersion(
    params: UpdateClinicTemplateOverrideBaseVersionInput,
  ): Promise<ClinicTemplateOverride | null> {
    await this.repository.update(
      { id: params.overrideId },
      {
        baseTemplateVersionId: params.baseTemplateVersionId,
        baseTemplateVersionNumber: params.baseTemplateVersionNumber,
        updatedAt: new Date(),
      },
    );

    const entity = await this.repository.findOne({ where: { id: params.overrideId } });
    return entity ? ClinicMapper.toTemplateOverride(entity) : null;
  }
}
