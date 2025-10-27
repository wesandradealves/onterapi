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
  type GetClinicScheduleSettingsInput,
  type IGetClinicScheduleSettingsUseCase,
  IGetClinicScheduleSettingsUseCase as IGetClinicScheduleSettingsUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/get-clinic-schedule-settings.use-case.interface';
import { ClinicConfigurationVersion } from '../../../domain/clinic/types/clinic.types';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';
import { ClinicConfigurationTelemetryService } from '../services/clinic-configuration-telemetry.service';
import { ClinicConfigurationCacheService } from '../services/clinic-configuration-cache.service';

@Injectable()
export class GetClinicScheduleSettingsUseCase
  extends BaseUseCase<GetClinicScheduleSettingsInput, ClinicConfigurationVersion>
  implements IGetClinicScheduleSettingsUseCase
{
  protected readonly logger = new Logger(GetClinicScheduleSettingsUseCase.name);

  constructor(
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
    @Inject(IClinicConfigurationRepositoryToken)
    private readonly configurationRepository: IClinicConfigurationRepository,
    private readonly telemetryService: ClinicConfigurationTelemetryService,
    private readonly configurationCache: ClinicConfigurationCacheService,
  ) {
    super();
  }

  protected async handle(
    input: GetClinicScheduleSettingsInput,
  ): Promise<ClinicConfigurationVersion> {
    const cached = await this.configurationCache.get({
      tenantId: input.tenantId,
      clinicId: input.clinicId,
      section: 'schedule',
    });

    if (cached) {
      return cached;
    }

    const clinic = await this.clinicRepository.findByTenant(input.tenantId, input.clinicId);

    if (!clinic) {
      throw ClinicErrorFactory.clinicNotFound('Clinica nao encontrada');
    }

    const version = await this.configurationRepository.findLatestAppliedVersion(
      input.clinicId,
      'schedule',
    );

    if (!version) {
      throw ClinicErrorFactory.configurationVersionNotFound(
        'Configuracoes de agenda nao encontradas para a clinica',
      );
    }

    version.telemetry = this.telemetryService.ensureTelemetry({
      clinic,
      section: 'schedule',
      payload: version.payload ?? {},
      appliedAt: version.appliedAt,
      createdBy: version.createdBy,
      autoApply: version.autoApply,
    });

    await this.configurationCache.set({
      tenantId: input.tenantId,
      clinicId: input.clinicId,
      section: 'schedule',
      version,
    });

    return version;
  }
}

export const GetClinicScheduleSettingsUseCaseToken = IGetClinicScheduleSettingsUseCaseToken;
