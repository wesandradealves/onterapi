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
  type IUpdateClinicIntegrationSettingsUseCase,
  IUpdateClinicIntegrationSettingsUseCase as IUpdateClinicIntegrationSettingsUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/update-clinic-integration-settings.use-case.interface';
import {
  ClinicConfigurationVersion,
  UpdateClinicIntegrationSettingsInput,
} from '../../../domain/clinic/types/clinic.types';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';
import { ClinicConfigurationValidator } from '../services/clinic-configuration-validator.service';
import { ClinicTemplateOverrideService } from '../services/clinic-template-override.service';
import { ClinicConfigurationTelemetryService } from '../services/clinic-configuration-telemetry.service';
import { ClinicConfigurationCacheService } from '../services/clinic-configuration-cache.service';

@Injectable()
export class UpdateClinicIntegrationSettingsUseCase
  extends BaseUseCase<UpdateClinicIntegrationSettingsInput, ClinicConfigurationVersion>
  implements IUpdateClinicIntegrationSettingsUseCase
{
  protected readonly logger = new Logger(UpdateClinicIntegrationSettingsUseCase.name);

  constructor(
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
    @Inject(IClinicConfigurationRepositoryToken)
    private readonly configurationRepository: IClinicConfigurationRepository,
    private readonly configurationValidator: ClinicConfigurationValidator,
    private readonly templateOverrideService: ClinicTemplateOverrideService,
    private readonly telemetryService: ClinicConfigurationTelemetryService,
    private readonly configurationCache: ClinicConfigurationCacheService,
  ) {
    super();
  }

  protected async handle(
    input: UpdateClinicIntegrationSettingsInput,
  ): Promise<ClinicConfigurationVersion> {
    const clinic = await this.clinicRepository.findByTenant(input.tenantId, input.clinicId);

    if (!clinic) {
      throw ClinicErrorFactory.clinicNotFound('Clinica nao encontrada');
    }

    const payload = JSON.parse(JSON.stringify(input.integrationSettings ?? {}));

    await this.telemetryService.markSaving({
      clinic,
      section: 'integrations',
      requestedBy: input.requestedBy,
      payload,
    });

    try {
      this.configurationValidator.validateIntegrationSettings(input.integrationSettings);

      const version = await this.configurationRepository.createVersion({
        clinicId: input.clinicId,
        tenantId: input.tenantId,
        section: 'integrations',
        payload,
        createdBy: input.requestedBy,
        autoApply: true,
      });

      await this.configurationRepository.applyVersion({
        clinicId: input.clinicId,
        tenantId: input.tenantId,
        section: 'integrations',
        versionId: version.id,
        appliedBy: input.requestedBy,
      });

      version.appliedAt = new Date();

      await this.clinicRepository.setCurrentConfigurationVersion({
        clinicId: input.clinicId,
        tenantId: input.tenantId,
        section: 'integrations',
        versionId: version.id,
        updatedBy: input.requestedBy,
      });

      await this.templateOverrideService.upsertManualOverride({
        clinic,
        section: 'integrations',
        payload,
        appliedVersionId: version.id,
        updatedBy: input.requestedBy,
      });

      const telemetry = await this.telemetryService.markSaved({
        clinic,
        section: 'integrations',
        requestedBy: input.requestedBy,
        payload,
      });

      version.telemetry = telemetry;

      await this.configurationCache.set({
        tenantId: input.tenantId,
        clinicId: input.clinicId,
        section: 'integrations',
        version,
      });

      return version;
    } catch (error) {
      await this.telemetryService.markError({
        clinic,
        section: 'integrations',
        requestedBy: input.requestedBy,
        error,
      });
      throw error;
    }
  }
}

export const UpdateClinicIntegrationSettingsUseCaseToken =
  IUpdateClinicIntegrationSettingsUseCaseToken;
