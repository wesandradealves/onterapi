import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import {
  type IClinicRepository,
  IClinicRepository as IClinicRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic.repository.interface';
import {
  type IClinicConfigurationRepository,
  IClinicConfigurationRepository as IClinicConfigurationRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-configuration.repository.interface';
import {
  type IUpdateClinicSecuritySettingsUseCase,
  IUpdateClinicSecuritySettingsUseCase as IUpdateClinicSecuritySettingsUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/update-clinic-security-settings.use-case.interface';
import {
  ClinicConfigurationVersion,
  ClinicSecurityComplianceDocument,
  UpdateClinicSecuritySettingsInput,
} from '../../../domain/clinic/types/clinic.types';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';
import { ClinicConfigurationValidator } from '../services/clinic-configuration-validator.service';
import { ClinicTemplateOverrideService } from '../services/clinic-template-override.service';
import { ClinicConfigurationTelemetryService } from '../services/clinic-configuration-telemetry.service';
import { ClinicConfigurationCacheService } from '../services/clinic-configuration-cache.service';
import { ClinicAuditService } from '../../../infrastructure/clinic/services/clinic-audit.service';

@Injectable()
export class UpdateClinicSecuritySettingsUseCase
  extends BaseUseCase<UpdateClinicSecuritySettingsInput, ClinicConfigurationVersion>
  implements IUpdateClinicSecuritySettingsUseCase
{
  protected readonly logger = new Logger(UpdateClinicSecuritySettingsUseCase.name);

  constructor(
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
    @Inject(IClinicConfigurationRepositoryToken)
    private readonly configurationRepository: IClinicConfigurationRepository,
    private readonly auditService: ClinicAuditService,
    private readonly configurationValidator: ClinicConfigurationValidator,
    private readonly templateOverrideService: ClinicTemplateOverrideService,
    private readonly telemetryService: ClinicConfigurationTelemetryService,
    private readonly configurationCache: ClinicConfigurationCacheService,
  ) {
    super();
  }

  protected async handle(
    input: UpdateClinicSecuritySettingsInput,
  ): Promise<ClinicConfigurationVersion> {
    const clinic = await this.clinicRepository.findByTenant(input.tenantId, input.clinicId);

    if (!clinic) {
      throw ClinicErrorFactory.clinicNotFound('Clinica nao encontrada');
    }

    const payload = JSON.parse(JSON.stringify(input.securitySettings ?? {}));

    await this.telemetryService.markSaving({
      clinic,
      section: 'security',
      requestedBy: input.requestedBy,
      payload,
    });

    try {
      this.configurationValidator.validateSecuritySettings(input.securitySettings);

      const version = await this.configurationRepository.createVersion({
        clinicId: input.clinicId,
        tenantId: input.tenantId,
        section: 'security',
        payload,
        createdBy: input.requestedBy,
        autoApply: true,
      });

      await this.configurationRepository.applyVersion({
        clinicId: input.clinicId,
        tenantId: input.tenantId,
        section: 'security',
        versionId: version.id,
        appliedBy: input.requestedBy,
      });

      version.appliedAt = new Date();

      await this.clinicRepository.setCurrentConfigurationVersion({
        clinicId: input.clinicId,
        tenantId: input.tenantId,
        section: 'security',
        versionId: version.id,
        updatedBy: input.requestedBy,
      });

      await this.templateOverrideService.upsertManualOverride({
        clinic,
        section: 'security',
        payload,
        appliedVersionId: version.id,
        updatedBy: input.requestedBy,
      });

      const complianceDocuments = this.normalizeComplianceDocuments(input.securitySettings);

      await this.clinicRepository.updateComplianceDocuments({
        clinicId: input.clinicId,
        tenantId: input.tenantId,
        documents: complianceDocuments,
        updatedBy: input.requestedBy,
      });

      await this.auditService.register({
        event: 'clinic.security_settings.updated',
        clinicId: input.clinicId,
        tenantId: input.tenantId,
        performedBy: input.requestedBy,
        detail: {
          versionId: version.id,
          complianceDocuments: complianceDocuments.map((document) => ({
            type: document.type,
            status: document.status ?? 'unknown',
            expiresAt:
              document.expiresAt === null
                ? null
                : document.expiresAt instanceof Date
                  ? document.expiresAt.toISOString()
                  : undefined,
          })),
        },
      });

      const telemetry = await this.telemetryService.markSaved({
        clinic,
        section: 'security',
        requestedBy: input.requestedBy,
        payload,
      });

      version.telemetry = telemetry;

      await this.configurationCache.set({
        tenantId: input.tenantId,
        clinicId: input.clinicId,
        section: 'security',
        version,
      });

      return version;
    } catch (error) {
      await this.telemetryService.markError({
        clinic,
        section: 'security',
        requestedBy: input.requestedBy,
        error,
      });

      throw error;
    }
  }

  private normalizeComplianceDocuments(
    settings: UpdateClinicSecuritySettingsInput['securitySettings'],
  ): ClinicSecurityComplianceDocument[] {
    const documents = settings.compliance?.documents ?? [];
    if (documents.length === 0) {
      return [];
    }

    return documents.map((document) => {
      const normalized: ClinicSecurityComplianceDocument = {
        type: document.type.trim(),
        required: document.required ?? true,
        status: document.status ?? 'unknown',
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
        normalized.expiresAt = new Date(document.expiresAt);
      }

      if (document.metadata && Object.keys(document.metadata).length > 0) {
        normalized.metadata = JSON.parse(JSON.stringify(document.metadata));
      }

      if (document.updatedAt instanceof Date) {
        normalized.updatedAt = new Date(document.updatedAt);
      }

      if (document.updatedBy) {
        normalized.updatedBy = document.updatedBy;
      }

      return normalized;
    });
  }
}

export const UpdateClinicSecuritySettingsUseCaseToken = IUpdateClinicSecuritySettingsUseCaseToken;
