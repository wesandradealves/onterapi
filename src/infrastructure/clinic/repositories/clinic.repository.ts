import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import {
  Clinic,
  ClinicComplianceDocumentStatus,
  ClinicConfigurationSection,
  ClinicConfigurationTelemetry,
  ClinicGeneralSettings,
  ClinicSecurityComplianceDocument,
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

  async findByIds(params: {
    tenantId: string;
    clinicIds: string[];
    includeDeleted?: boolean;
  }): Promise<Clinic[]> {
    if (!params.clinicIds || params.clinicIds.length === 0) {
      return [];
    }

    const entities = await this.repository.find({
      where: {
        tenantId: params.tenantId,
        id: In(params.clinicIds),
      },
      ...(params.includeDeleted ? { withDeleted: true } : {}),
    });

    const clinics = entities.map(ClinicMapper.toClinic);
    const order = new Map<string, number>();
    params.clinicIds.forEach((id, index) => order.set(id, index));

    clinics.sort((a, b) => {
      const indexA = order.get(a.id) ?? 0;
      const indexB = order.get(b.id) ?? 0;
      return indexA - indexB;
    });

    return clinics;
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

  async updateConfigurationTelemetry(params: {
    clinicId: string;
    tenantId: string;
    section: ClinicConfigurationSection;
    telemetry: ClinicConfigurationTelemetry;
  }): Promise<void> {
    const entity = await this.repository.findOne({
      where: { id: params.clinicId, tenantId: params.tenantId },
    });

    if (!entity) {
      throw new Error('Clinic not found');
    }

    const metadata = (entity.metadata ?? {}) as Record<string, unknown>;
    const telemetryRaw = (metadata.configurationTelemetry ?? {}) as Record<string, unknown>;

    const entry: Record<string, unknown> = {
      section: params.section,
      state: params.telemetry.state,
      completionScore: Math.max(
        0,
        Math.min(100, Math.round(params.telemetry.completionScore ?? 0)),
      ),
    };

    if (params.telemetry.lastAttemptAt) {
      entry.lastAttemptAt = params.telemetry.lastAttemptAt.toISOString();
    }

    if (params.telemetry.lastSavedAt) {
      entry.lastSavedAt = params.telemetry.lastSavedAt.toISOString();
    }

    if (params.telemetry.lastErrorAt) {
      entry.lastErrorAt = params.telemetry.lastErrorAt.toISOString();
    }

    if (params.telemetry.lastErrorMessage) {
      entry.lastErrorMessage = params.telemetry.lastErrorMessage;
    }

    if (params.telemetry.lastUpdatedBy) {
      entry.lastUpdatedBy = params.telemetry.lastUpdatedBy;
    }

    if (params.telemetry.autosaveIntervalSeconds !== undefined) {
      entry.autosaveIntervalSeconds = params.telemetry.autosaveIntervalSeconds;
    }

    if (params.telemetry.pendingConflicts !== undefined) {
      entry.pendingConflicts = params.telemetry.pendingConflicts;
    }

    telemetryRaw[params.section] = entry;
    metadata.configurationTelemetry = telemetryRaw;
    entity.metadata = metadata;

    await this.repository.save(entity);
  }

  async updateGeneralProfile(params: {
    clinicId: string;
    tenantId: string;
    requestedBy: string;
    settings: ClinicGeneralSettings;
  }): Promise<Clinic> {
    const entity = await this.repository.findOne({
      where: { id: params.clinicId, tenantId: params.tenantId },
    });

    if (!entity) {
      throw new Error('Clinic not found');
    }

    entity.name = params.settings.tradeName.trim();

    if (params.settings.document?.value) {
      const digits = params.settings.document.value.replace(/\D+/g, '');
      entity.documentType = params.settings.document.type;
      entity.documentValue = digits.length > 0 ? digits : null;
    } else {
      entity.documentType = null;
      entity.documentValue = null;
    }

    const metadata = entity.metadata ?? {};
    metadata.generalSettings = {
      ...params.settings,
      foundationDate: params.settings.foundationDate
        ? params.settings.foundationDate.toISOString()
        : undefined,
    };

    entity.metadata = metadata;

    const saved = await this.repository.save(entity);
    return ClinicMapper.toClinic(saved);
  }

  async updateTemplatePropagationMetadata(params: {
    clinicId: string;
    tenantId: string;
    section: ClinicConfigurationSection;
    templateClinicId: string;
    templateVersionId: string;
    templateVersionNumber: number;
    propagatedVersionId: string;
    propagatedAt: Date;
    triggeredBy: string;
  }): Promise<void> {
    const entity = await this.repository.findOne({
      where: { id: params.clinicId, tenantId: params.tenantId },
    });

    if (!entity) {
      throw new Error('Clinic not found');
    }

    const metadata = (entity.metadata ?? {}) as Record<string, unknown>;
    const templatePropagationRaw = (metadata.templatePropagation ?? {}) as Record<string, unknown>;
    const sectionsRaw = (templatePropagationRaw.sections ?? {}) as Record<string, unknown>;

    sectionsRaw[params.section] = {
      templateVersionId: params.templateVersionId,
      templateVersionNumber: params.templateVersionNumber,
      propagatedVersionId: params.propagatedVersionId,
      propagatedAt: params.propagatedAt.toISOString(),
      triggeredBy: params.triggeredBy,
    };

    metadata.templatePropagation = {
      templateClinicId: params.templateClinicId,
      lastPropagationAt: params.propagatedAt.toISOString(),
      lastTriggeredBy: params.triggeredBy,
      sections: sectionsRaw,
    };

    entity.metadata = metadata;
    await this.repository.save(entity);
  }

  async updateTemplateOverrideMetadata(params: {
    clinicId: string;
    tenantId: string;
    section: ClinicConfigurationSection;
    override?: {
      overrideId: string;
      overrideVersion: number;
      overrideHash: string;
      updatedAt: Date;
      updatedBy: string;
      appliedConfigurationVersionId?: string | null;
    } | null;
  }): Promise<void> {
    const entity = await this.repository.findOne({
      where: { id: params.clinicId, tenantId: params.tenantId },
    });

    if (!entity) {
      throw new Error('Clinic not found');
    }

    const metadata = (entity.metadata ?? {}) as Record<string, unknown>;
    const templatePropagation = (metadata.templatePropagation ?? {}) as Record<string, unknown>;
    const sections = (templatePropagation.sections ?? {}) as Record<string, unknown>;
    const sectionEntry = (sections[params.section] ?? {}) as Record<string, unknown>;

    if (params.override) {
      sectionEntry.override = {
        overrideId: params.override.overrideId,
        overrideVersion: params.override.overrideVersion,
        overrideHash: params.override.overrideHash,
        updatedAt: params.override.updatedAt.toISOString(),
        updatedBy: params.override.updatedBy,
        appliedConfigurationVersionId: params.override.appliedConfigurationVersionId ?? null,
      };
    } else {
      delete sectionEntry.override;
    }

    sections[params.section] = sectionEntry;
    templatePropagation.sections = sections;
    metadata.templatePropagation = templatePropagation;

    entity.metadata = metadata;
    await this.repository.save(entity);
  }

  async updateComplianceDocuments(params: {
    clinicId: string;
    tenantId: string;
    documents: ClinicSecurityComplianceDocument[];
    updatedBy: string;
  }): Promise<void> {
    const entity = await this.repository.findOne({
      where: { id: params.clinicId, tenantId: params.tenantId },
    });

    if (!entity) {
      throw new Error('Clinic not found');
    }

    const metadata = (entity.metadata ?? {}) as Record<string, unknown>;
    const complianceRaw = (metadata.compliance ?? {}) as Record<string, unknown>;

    complianceRaw.documents = params.documents.map((document) => {
      const normalized: Record<string, unknown> = {
        type: document.type.trim(),
        required: document.required ?? true,
        status: document.status ?? 'unknown',
        metadata:
          document.metadata && Object.keys(document.metadata).length > 0
            ? JSON.parse(JSON.stringify(document.metadata))
            : undefined,
      };

      if (document.id) {
        normalized.id = document.id;
      }

      if (document.name) {
        normalized.name = document.name.trim();
      }

      if (document.expiresAt === null) {
        normalized.expiresAt = null;
      } else if (document.expiresAt instanceof Date) {
        normalized.expiresAt = document.expiresAt.toISOString();
      }

      const updatedAt = document.updatedAt instanceof Date ? document.updatedAt : new Date();
      normalized.updatedAt = updatedAt.toISOString();

      if (document.updatedBy) {
        normalized.updatedBy = document.updatedBy;
      } else {
        normalized.updatedBy = params.updatedBy;
      }

      return normalized;
    });

    complianceRaw.updatedAt = new Date().toISOString();
    complianceRaw.updatedBy = params.updatedBy;

    metadata.compliance = complianceRaw;
    entity.metadata = metadata;

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

  async listComplianceDocuments(params: {
    tenantId: string;
    clinicIds: string[];
  }): Promise<Record<string, ClinicComplianceDocumentStatus[]>> {
    const uniqueIds = Array.from(
      new Set(
        (params.clinicIds ?? [])
          .map((id) => id?.trim())
          .filter((id): id is string => typeof id === 'string' && id.length > 0),
      ),
    );

    if (uniqueIds.length === 0) {
      return {};
    }

    const entities = await this.repository.find({
      where: {
        tenantId: params.tenantId,
        id: In(uniqueIds),
      },
      select: ['id', 'metadata'],
    });

    const result: Record<string, ClinicComplianceDocumentStatus[]> = {};

    entities.forEach((entity) => {
      const metadata = (entity.metadata ?? {}) as Record<string, unknown>;
      const documents = ClinicMapper.extractComplianceDocuments(metadata);
      result[entity.id] = documents;
    });

    return result;
  }

  async listTenantIds(): Promise<string[]> {
    const rows = await this.repository
      .createQueryBuilder('clinic')
      .select('DISTINCT clinic.tenant_id', 'tenantId')
      .where('clinic.tenant_id IS NOT NULL')
      .getRawMany<{ tenantId: string | null }>();

    return rows
      .map((row) => row.tenantId)
      .filter(
        (tenantId): tenantId is string => typeof tenantId === 'string' && tenantId.length > 0,
      );
  }
}
