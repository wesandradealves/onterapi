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
  type GetClinicNotificationSettingsInput,
  type IGetClinicNotificationSettingsUseCase,
  IGetClinicNotificationSettingsUseCase as IGetClinicNotificationSettingsUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/get-clinic-notification-settings.use-case.interface';
import { ClinicConfigurationVersion } from '../../../domain/clinic/types/clinic.types';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';

@Injectable()
export class GetClinicNotificationSettingsUseCase
  extends BaseUseCase<GetClinicNotificationSettingsInput, ClinicConfigurationVersion>
  implements IGetClinicNotificationSettingsUseCase
{
  protected readonly logger = new Logger(GetClinicNotificationSettingsUseCase.name);

  constructor(
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
    @Inject(IClinicConfigurationRepositoryToken)
    private readonly configurationRepository: IClinicConfigurationRepository,
  ) {
    super();
  }

  protected async handle(
    input: GetClinicNotificationSettingsInput,
  ): Promise<ClinicConfigurationVersion> {
    const clinic = await this.clinicRepository.findByTenant(input.tenantId, input.clinicId);

    if (!clinic) {
      throw ClinicErrorFactory.clinicNotFound('Clínica não encontrada');
    }

    const version = await this.configurationRepository.findLatestAppliedVersion(
      input.clinicId,
      'notifications',
    );

    if (!version) {
      throw ClinicErrorFactory.configurationVersionNotFound(
        'Configurações de notificações não encontradas para a clínica',
      );
    }

    return version;
  }
}

export const GetClinicNotificationSettingsUseCaseToken = IGetClinicNotificationSettingsUseCaseToken;
