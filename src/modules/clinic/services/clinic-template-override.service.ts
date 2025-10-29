import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  Clinic,
  ClinicConfigurationSection,
  ClinicConfigurationVersion,
  ClinicTemplateOverride,
} from '../../../domain/clinic/types/clinic.types';
import {
  type IClinicTemplateOverrideRepository,
  IClinicTemplateOverrideRepository as IClinicTemplateOverrideRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-template-override.repository.interface';
import {
  type IClinicConfigurationRepository,
  IClinicConfigurationRepository as IClinicConfigurationRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-configuration.repository.interface';
import {
  type IClinicRepository,
  IClinicRepository as IClinicRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic.repository.interface';
import {
  calculateOverrideDiff,
  hashOverridePayload,
  mergeTemplatePayload,
} from '../utils/template-override.util';
import { ClinicAuditService } from '../../../infrastructure/clinic/services/clinic-audit.service';
import { ClinicConfigurationCacheService } from './clinic-configuration-cache.service';

interface TemplateSectionMetadata {
  templateClinicId: string;
  templateVersionId: string;
  templateVersionNumber?: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

@Injectable()
export class ClinicTemplateOverrideService {
  private readonly logger = new Logger(ClinicTemplateOverrideService.name);

  constructor(
    @Inject(IClinicTemplateOverrideRepositoryToken)
    private readonly overrideRepository: IClinicTemplateOverrideRepository,
    @Inject(IClinicConfigurationRepositoryToken)
    private readonly configurationRepository: IClinicConfigurationRepository,
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
    private readonly auditService: ClinicAuditService,
    private readonly configurationCache: ClinicConfigurationCacheService,
  ) {}

  async mergeWithActiveOverride(params: {
    clinic: Clinic;
    section: ClinicConfigurationSection;
    templateVersion: ClinicConfigurationVersion;
  }): Promise<{
    payload: Record<string, unknown>;
    override?: ClinicTemplateOverride | null;
  }> {
    const override = await this.overrideRepository.findActive({
      clinicId: params.clinic.id,
      tenantId: params.clinic.tenantId,
      section: params.section,
    });

    if (!override) {
      return { payload: params.templateVersion.payload ?? {} };
    }

    if (override.baseTemplateVersionId !== params.templateVersion.id) {
      await this.overrideRepository.updateBaseTemplateVersion({
        overrideId: override.id,
        baseTemplateVersionId: params.templateVersion.id,
        baseTemplateVersionNumber: params.templateVersion.version,
      });
    }

    const payload = mergeTemplatePayload(
      params.templateVersion.payload ?? {},
      override.overridePayload,
    );
    return { payload, override };
  }

  async markOverrideApplied(params: {
    clinic: Clinic;
    section: ClinicConfigurationSection;
    override: ClinicTemplateOverride;
    appliedVersionId: string;
    appliedAt?: Date;
    updatedBy: string;
  }): Promise<void> {
    const appliedAt = params.appliedAt ?? new Date();

    await this.overrideRepository.updateAppliedVersion({
      overrideId: params.override.id,
      appliedConfigurationVersionId: params.appliedVersionId,
      appliedAt,
    });

    await this.clinicRepository.updateTemplateOverrideMetadata({
      clinicId: params.clinic.id,
      tenantId: params.clinic.tenantId,
      section: params.section,
      override: {
        overrideId: params.override.id,
        overrideVersion: params.override.overrideVersion,
        overrideHash: params.override.overrideHash,
        updatedAt: appliedAt,
        updatedBy: params.updatedBy,
        appliedConfigurationVersionId: params.appliedVersionId,
      },
    });

    await this.auditService.register({
      tenantId: params.clinic.tenantId,
      clinicId: params.clinic.id,
      performedBy: params.updatedBy,
      event: 'clinic.configuration.override_applied',
      detail: {
        section: params.section,
        overrideId: params.override.id,
        overrideVersion: params.override.overrideVersion,
        appliedConfigurationVersionId: params.appliedVersionId,
      },
    });

    await this.configurationCache.invalidate({
      tenantId: params.clinic.tenantId,
      clinicId: params.clinic.id,
      section: params.section,
    });
  }

  async upsertManualOverride(params: {
    clinic: Clinic;
    section: ClinicConfigurationSection;
    payload: Record<string, unknown>;
    appliedVersionId: string;
    updatedBy: string;
  }): Promise<void> {
    const metadata = this.extractTemplateMetadata(params.clinic, params.section);

    if (!metadata) {
      this.logger.verbose(
        `Nenhuma metadado de template para ${params.clinic.id}/${params.section}; override manual ignorado`,
      );
      await this.overrideRepository.supersedeBySection({
        clinicId: params.clinic.id,
        tenantId: params.clinic.tenantId,
        section: params.section,
        supersededBy: params.updatedBy,
      });
      await this.clinicRepository.updateTemplateOverrideMetadata({
        clinicId: params.clinic.id,
        tenantId: params.clinic.tenantId,
        section: params.section,
        override: null,
      });
      await this.configurationCache.invalidate({
        tenantId: params.clinic.tenantId,
        clinicId: params.clinic.id,
        section: params.section,
      });
      return;
    }

    const templateVersion = await this.configurationRepository.findVersionById(
      metadata.templateVersionId,
    );

    if (!templateVersion) {
      this.logger.warn(
        `Versao de template ${metadata.templateVersionId} nao encontrada ao salvar override para ${params.clinic.id}/${params.section}`,
      );
      return;
    }

    const diff = calculateOverrideDiff(templateVersion.payload ?? {}, params.payload ?? {});

    const existingOverride = await this.overrideRepository.findActive({
      clinicId: params.clinic.id,
      tenantId: params.clinic.tenantId,
      section: params.section,
    });

    const isDiffEmpty = !diff || (isRecord(diff) && Object.keys(diff).length === 0);

    if (isDiffEmpty) {
      if (existingOverride) {
        await this.overrideRepository.supersede({
          overrideId: existingOverride.id,
          supersededBy: params.updatedBy,
        });

        await this.clinicRepository.updateTemplateOverrideMetadata({
          clinicId: params.clinic.id,
          tenantId: params.clinic.tenantId,
          section: params.section,
          override: null,
        });

        await this.auditService.register({
          tenantId: params.clinic.tenantId,
          clinicId: params.clinic.id,
          performedBy: params.updatedBy,
          event: 'clinic.configuration.override_cleared',
          detail: {
            section: params.section,
            overrideId: existingOverride.id,
          },
        });

        await this.configurationCache.invalidate({
          tenantId: params.clinic.tenantId,
          clinicId: params.clinic.id,
          section: params.section,
        });
      }

      return;
    }

    if (!isRecord(diff)) {
      this.logger.warn(
        `Diff calculado para override invalido em ${params.clinic.id}/${params.section}`,
        diff,
      );
      return;
    }

    const overridePayload = diff;

    const overrideHash = hashOverridePayload(overridePayload);
    let activeOverride = existingOverride;

    if (existingOverride && existingOverride.overrideHash === overrideHash) {
      if (existingOverride.baseTemplateVersionId !== templateVersion.id) {
        activeOverride = await this.overrideRepository.updateBaseTemplateVersion({
          overrideId: existingOverride.id,
          baseTemplateVersionId: templateVersion.id,
          baseTemplateVersionNumber: templateVersion.version,
        });
      }
    } else {
      if (existingOverride) {
        await this.overrideRepository.supersede({
          overrideId: existingOverride.id,
          supersededBy: params.updatedBy,
        });
      }

      activeOverride = await this.overrideRepository.create({
        clinicId: params.clinic.id,
        tenantId: params.clinic.tenantId,
        templateClinicId: metadata.templateClinicId,
        section: params.section,
        baseTemplateVersionId: templateVersion.id,
        baseTemplateVersionNumber: templateVersion.version,
        overridePayload,
        overrideHash,
        createdBy: params.updatedBy,
      });

      await this.auditService.register({
        tenantId: params.clinic.tenantId,
        clinicId: params.clinic.id,
        performedBy: params.updatedBy,
        event: 'clinic.configuration.override_saved',
        detail: {
          section: params.section,
          overrideId: activeOverride.id,
          overrideVersion: activeOverride.overrideVersion,
          baseTemplateVersionId: templateVersion.id,
        },
      });
    }

    if (!activeOverride) {
      this.logger.error(
        `Falha ao resolver override ativo para ${params.clinic.id}/${params.section}`,
      );
      return;
    }

    const appliedAt = new Date();

    const updatedOverride = await this.overrideRepository.updateAppliedVersion({
      overrideId: activeOverride.id,
      appliedConfigurationVersionId: params.appliedVersionId,
      appliedAt,
    });

    await this.clinicRepository.updateTemplateOverrideMetadata({
      clinicId: params.clinic.id,
      tenantId: params.clinic.tenantId,
      section: params.section,
      override: {
        overrideId: activeOverride.id,
        overrideVersion: activeOverride.overrideVersion,
        overrideHash: activeOverride.overrideHash,
        updatedAt: appliedAt,
        updatedBy: params.updatedBy,
        appliedConfigurationVersionId:
          updatedOverride?.appliedConfigurationVersionId ?? params.appliedVersionId,
      },
    });

    await this.configurationCache.invalidate({
      tenantId: params.clinic.tenantId,
      clinicId: params.clinic.id,
      section: params.section,
    });
  }

  private extractTemplateMetadata(
    clinic: Clinic,
    section: ClinicConfigurationSection,
  ): TemplateSectionMetadata | null {
    if (!clinic.metadata || typeof clinic.metadata !== 'object') {
      return null;
    }

    const propagation = clinic.metadata['templatePropagation'];

    if (!propagation || typeof propagation !== 'object') {
      return null;
    }

    const sections = (propagation as Record<string, unknown>)['sections'];

    if (!sections || typeof sections !== 'object') {
      return null;
    }

    const sectionMetadata = (sections as Record<string, unknown>)[section];

    if (!sectionMetadata || typeof sectionMetadata !== 'object') {
      return null;
    }

    const templateClinicId = (propagation as Record<string, unknown>)['templateClinicId'];
    const templateVersionId = (sectionMetadata as Record<string, unknown>)['templateVersionId'];
    const templateVersionNumber = (sectionMetadata as Record<string, unknown>)[
      'templateVersionNumber'
    ];

    if (typeof templateClinicId !== 'string' || typeof templateVersionId !== 'string') {
      return null;
    }

    return {
      templateClinicId,
      templateVersionId,
      templateVersionNumber:
        typeof templateVersionNumber === 'number' ? templateVersionNumber : undefined,
    };
  }
}

export const ClinicTemplateOverrideServiceToken = Symbol('ClinicTemplateOverrideService');
