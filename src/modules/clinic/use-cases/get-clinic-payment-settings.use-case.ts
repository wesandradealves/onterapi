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
  type GetClinicPaymentSettingsInput,
  type IGetClinicPaymentSettingsUseCase,
  IGetClinicPaymentSettingsUseCase as IGetClinicPaymentSettingsUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/get-clinic-payment-settings.use-case.interface';
import { ClinicConfigurationVersion } from '../../../domain/clinic/types/clinic.types';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';

@Injectable()
export class GetClinicPaymentSettingsUseCase
  extends BaseUseCase<GetClinicPaymentSettingsInput, ClinicConfigurationVersion>
  implements IGetClinicPaymentSettingsUseCase
{
  protected readonly logger = new Logger(GetClinicPaymentSettingsUseCase.name);

  constructor(
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
    @Inject(IClinicConfigurationRepositoryToken)
    private readonly configurationRepository: IClinicConfigurationRepository,
  ) {
    super();
  }

  protected async handle(
    input: GetClinicPaymentSettingsInput,
  ): Promise<ClinicConfigurationVersion> {
    const clinic = await this.clinicRepository.findByTenant(input.tenantId, input.clinicId);

    if (!clinic) {
      throw ClinicErrorFactory.clinicNotFound('Clínica não encontrada');
    }

    const version = await this.configurationRepository.findLatestAppliedVersion(
      input.clinicId,
      'payments',
    );

    if (!version) {
      throw ClinicErrorFactory.configurationVersionNotFound(
        'Configurações financeiras não encontradas para a clínica',
      );
    }

    return version;
  }
}

export const GetClinicPaymentSettingsUseCaseToken = IGetClinicPaymentSettingsUseCaseToken;
