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
  type GetClinicIntegrationSettingsInput,
  type IGetClinicIntegrationSettingsUseCase,
  IGetClinicIntegrationSettingsUseCase as IGetClinicIntegrationSettingsUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/get-clinic-integration-settings.use-case.interface';
import { ClinicConfigurationVersion } from '../../../domain/clinic/types/clinic.types';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';
import { ClinicConfigurationTelemetryService } from '../services/clinic-configuration-telemetry.service';
import { ClinicConfigurationCacheService } from '../services/clinic-configuration-cache.service';

@Injectable()
export class GetClinicIntegrationSettingsUseCase
  extends BaseUseCase<GetClinicIntegrationSettingsInput, ClinicConfigurationVersion>
  implements IGetClinicIntegrationSettingsUseCase
{
  protected readonly logger = new Logger(GetClinicIntegrationSettingsUseCase.name);

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
    input: GetClinicIntegrationSettingsInput,
  ): Promise<ClinicConfigurationVersion> {
    const cached = this.configurationCache.get({
      tenantId: input.tenantId,
      clinicId: input.clinicId,
      section: 'integrations',
    });

    if (cached) {
      return cached;
    }

    const clinic = await this.clinicRepository.findByTenant(input.tenantId, input.clinicId);

    if (!clinic) {
      throw ClinicErrorFactory.clinicNotFound('Clínica não encontrada');
    }

    const version = await this.configurationRepository.findLatestAppliedVersion(
      input.clinicId,
      'integrations',
    );

    if (!version) {
      throw ClinicErrorFactory.configurationVersionNotFound(
        'Configurações de integrações não encontradas para a clínica',
      );
    }

    version.telemetry = this.telemetryService.ensureTelemetry({
      clinic,
      section: 'integrations',
      payload: version.payload ?? {},
      appliedAt: version.appliedAt,
      createdBy: version.createdBy,
      autoApply: version.autoApply,
    });

    this.configurationCache.set({
      tenantId: input.tenantId,
      clinicId: input.clinicId,
      section: 'integrations',
      version,
    });

    return version;
  }
}

export const GetClinicIntegrationSettingsUseCaseToken = IGetClinicIntegrationSettingsUseCaseToken;
