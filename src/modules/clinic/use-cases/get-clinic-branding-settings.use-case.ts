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
  type GetClinicBrandingSettingsInput,
  type IGetClinicBrandingSettingsUseCase,
  IGetClinicBrandingSettingsUseCase as IGetClinicBrandingSettingsUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/get-clinic-branding-settings.use-case.interface';
import { ClinicConfigurationVersion } from '../../../domain/clinic/types/clinic.types';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';
import { ClinicConfigurationTelemetryService } from '../services/clinic-configuration-telemetry.service';
import { ClinicConfigurationCacheService } from '../services/clinic-configuration-cache.service';

@Injectable()
export class GetClinicBrandingSettingsUseCase
  extends BaseUseCase<GetClinicBrandingSettingsInput, ClinicConfigurationVersion>
  implements IGetClinicBrandingSettingsUseCase
{
  protected readonly logger = new Logger(GetClinicBrandingSettingsUseCase.name);

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
    input: GetClinicBrandingSettingsInput,
  ): Promise<ClinicConfigurationVersion> {
    const cached = this.configurationCache.get({
      tenantId: input.tenantId,
      clinicId: input.clinicId,
      section: 'branding',
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
      'branding',
    );

    if (!version) {
      throw ClinicErrorFactory.configurationVersionNotFound(
        'Configuracoes de identidade visual nao encontradas para a clinica',
      );
    }

    version.telemetry = this.telemetryService.ensureTelemetry({
      clinic,
      section: 'branding',
      payload: version.payload ?? {},
      appliedAt: version.appliedAt,
      createdBy: version.createdBy,
      autoApply: version.autoApply,
    });

    this.configurationCache.set({
      tenantId: input.tenantId,
      clinicId: input.clinicId,
      section: 'branding',
      version,
    });

    return version;
  }
}

export const GetClinicBrandingSettingsUseCaseToken = IGetClinicBrandingSettingsUseCaseToken;
