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
  type IUpdateClinicScheduleSettingsUseCase,
  IUpdateClinicScheduleSettingsUseCase as IUpdateClinicScheduleSettingsUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/update-clinic-schedule-settings.use-case.interface';
import {
  ClinicConfigurationVersion,
  UpdateClinicScheduleSettingsInput,
} from '../../../domain/clinic/types/clinic.types';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';
import { ClinicConfigurationValidator } from '../services/clinic-configuration-validator.service';
import { ClinicTemplateOverrideService } from '../services/clinic-template-override.service';
import { ClinicConfigurationTelemetryService } from '../services/clinic-configuration-telemetry.service';
import { ClinicConfigurationCacheService } from '../services/clinic-configuration-cache.service';

@Injectable()
export class UpdateClinicScheduleSettingsUseCase
  extends BaseUseCase<UpdateClinicScheduleSettingsInput, ClinicConfigurationVersion>
  implements IUpdateClinicScheduleSettingsUseCase
{
  protected readonly logger = new Logger(UpdateClinicScheduleSettingsUseCase.name);

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
    input: UpdateClinicScheduleSettingsInput,
  ): Promise<ClinicConfigurationVersion> {
    const clinic = await this.clinicRepository.findByTenant(input.tenantId, input.clinicId);

    if (!clinic) {
      throw ClinicErrorFactory.clinicNotFound('Clinica nao encontrada');
    }

    const payload = JSON.parse(JSON.stringify(input.scheduleSettings ?? {}));

    await this.telemetryService.markSaving({
      clinic,
      section: 'schedule',
      requestedBy: input.requestedBy,
      payload,
    });

    try {
      this.configurationValidator.validateScheduleSettings(input.scheduleSettings);

      const version = await this.configurationRepository.createVersion({
        clinicId: input.clinicId,
        tenantId: input.tenantId,
        section: 'schedule',
        payload,
        createdBy: input.requestedBy,
        autoApply: true,
      });

      await this.configurationRepository.applyVersion({
        clinicId: input.clinicId,
        tenantId: input.tenantId,
        section: 'schedule',
        versionId: version.id,
        appliedBy: input.requestedBy,
      });

      version.appliedAt = new Date();

      await this.clinicRepository.setCurrentConfigurationVersion({
        clinicId: input.clinicId,
        tenantId: input.tenantId,
        section: 'schedule',
        versionId: version.id,
        updatedBy: input.requestedBy,
      });

      await this.templateOverrideService.upsertManualOverride({
        clinic,
        section: 'schedule',
        payload,
        appliedVersionId: version.id,
        updatedBy: input.requestedBy,
      });

      const telemetry = await this.telemetryService.markSaved({
        clinic,
        section: 'schedule',
        requestedBy: input.requestedBy,
        payload,
      });

      version.telemetry = telemetry;

      await this.configurationCache.set({
        tenantId: input.tenantId,
        clinicId: input.clinicId,
        section: 'schedule',
        version,
      });

      return version;
    } catch (error) {
      await this.telemetryService.markError({
        clinic,
        section: 'schedule',
        requestedBy: input.requestedBy,
        error,
      });
      throw error;
    }
  }
}

export const UpdateClinicScheduleSettingsUseCaseToken = IUpdateClinicScheduleSettingsUseCaseToken;
