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
  type GetClinicServiceSettingsInput,
  type IGetClinicServiceSettingsUseCase,
  IGetClinicServiceSettingsUseCase as IGetClinicServiceSettingsUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/get-clinic-service-settings.use-case.interface';
import { ClinicConfigurationVersion } from '../../../domain/clinic/types/clinic.types';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';

@Injectable()
export class GetClinicServiceSettingsUseCase
  extends BaseUseCase<GetClinicServiceSettingsInput, ClinicConfigurationVersion>
  implements IGetClinicServiceSettingsUseCase
{
  protected readonly logger = new Logger(GetClinicServiceSettingsUseCase.name);

  constructor(
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
    @Inject(IClinicConfigurationRepositoryToken)
    private readonly configurationRepository: IClinicConfigurationRepository,
  ) {
    super();
  }

  protected async handle(
    input: GetClinicServiceSettingsInput,
  ): Promise<ClinicConfigurationVersion> {
    const clinic = await this.clinicRepository.findByTenant(input.tenantId, input.clinicId);

    if (!clinic) {
      throw ClinicErrorFactory.clinicNotFound('Clínica não encontrada');
    }

    const version = await this.configurationRepository.findLatestAppliedVersion(
      input.clinicId,
      'services',
    );

    if (!version) {
      throw ClinicErrorFactory.configurationVersionNotFound(
        'Configurações de serviços não encontradas para a clínica',
      );
    }

    return version;
  }
}

export const GetClinicServiceSettingsUseCaseToken = IGetClinicServiceSettingsUseCaseToken;
