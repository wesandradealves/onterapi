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
  ClinicConfigurationVersion,
  UpdateClinicGeneralSettingsInput,
} from '../../../domain/clinic/types/clinic.types';
import {
  type IUpdateClinicGeneralSettingsUseCase,
  IUpdateClinicGeneralSettingsUseCase as IUpdateClinicGeneralSettingsUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/update-clinic-general-settings.use-case.interface';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';
import { ClinicAuditService } from '../../../infrastructure/clinic/services/clinic-audit.service';
import { ClinicConfigurationValidator } from '../services/clinic-configuration-validator.service';
import { ClinicTemplateOverrideService } from '../services/clinic-template-override.service';
import { ClinicConfigurationTelemetryService } from '../services/clinic-configuration-telemetry.service';
import { ClinicConfigurationCacheService } from '../services/clinic-configuration-cache.service';

@Injectable()
export class UpdateClinicGeneralSettingsUseCase
  extends BaseUseCase<UpdateClinicGeneralSettingsInput, ClinicConfigurationVersion>
  implements IUpdateClinicGeneralSettingsUseCase
{
  protected readonly logger = new Logger(UpdateClinicGeneralSettingsUseCase.name);

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
    input: UpdateClinicGeneralSettingsInput,
  ): Promise<ClinicConfigurationVersion> {
    const clinic = await this.clinicRepository.findByTenant(input.tenantId, input.clinicId);

    if (!clinic) {
      throw ClinicErrorFactory.clinicNotFound('Clinica nao encontrada');
    }

    const payload = JSON.parse(JSON.stringify(input.settings ?? {}));

    await this.telemetryService.markSaving({
      clinic,
      section: 'general',
      requestedBy: input.requestedBy,
      payload,
    });

    try {
      await this.configurationValidator.validateGeneralSettings(clinic, input.settings);

      const updatedClinic = await this.clinicRepository.updateGeneralProfile({
        clinicId: clinic.id,
        tenantId: clinic.tenantId,
        requestedBy: input.requestedBy,
        settings: input.settings,
      });

      const version = await this.configurationRepository.createVersion({
        clinicId: input.clinicId,
        tenantId: input.tenantId,
        section: 'general',
        payload,
        createdBy: input.requestedBy,
        autoApply: true,
      });

      await this.configurationRepository.applyVersion({
        clinicId: input.clinicId,
        tenantId: input.tenantId,
        section: 'general',
        versionId: version.id,
        appliedBy: input.requestedBy,
      });

      version.appliedAt = new Date();

      await this.clinicRepository.setCurrentConfigurationVersion({
        clinicId: input.clinicId,
        tenantId: input.tenantId,
        section: 'general',
        versionId: version.id,
        updatedBy: input.requestedBy,
      });

      await this.auditService.register({
        event: 'clinic.general_settings.updated',
        clinicId: input.clinicId,
        tenantId: input.tenantId,
        performedBy: input.requestedBy,
        detail: {
          versionId: version.id,
        },
      });

      await this.templateOverrideService.upsertManualOverride({
        clinic: updatedClinic,
        section: 'general',
        payload,
        appliedVersionId: version.id,
        updatedBy: input.requestedBy,
      });

      const telemetry = await this.telemetryService.markSaved({
        clinic,
        section: 'general',
        requestedBy: input.requestedBy,
        payload,
      });

      version.telemetry = telemetry;

      await this.configurationCache.set({
        tenantId: input.tenantId,
        clinicId: input.clinicId,
        section: 'general',
        version,
      });

      return version;
    } catch (error) {
      await this.telemetryService.markError({
        clinic,
        section: 'general',
        requestedBy: input.requestedBy,
        error,
      });
      throw error;
    }
  }
}

export const UpdateClinicGeneralSettingsUseCaseToken = IUpdateClinicGeneralSettingsUseCaseToken;
