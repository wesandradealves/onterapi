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
  ) {
    super();
  }

  protected async handle(
    input: GetClinicScheduleSettingsInput,
  ): Promise<ClinicConfigurationVersion> {
    const clinic = await this.clinicRepository.findByTenant(input.tenantId, input.clinicId);

    if (!clinic) {
      throw ClinicErrorFactory.clinicNotFound('Clínica não encontrada');
    }

    const version = await this.configurationRepository.findLatestAppliedVersion(
      input.clinicId,
      'schedule',
    );

    if (!version) {
      throw ClinicErrorFactory.configurationVersionNotFound(
        'Configurações de agenda não encontradas para a clínica',
      );
    }

    return version;
  }
}

export const GetClinicScheduleSettingsUseCaseToken = IGetClinicScheduleSettingsUseCaseToken;
