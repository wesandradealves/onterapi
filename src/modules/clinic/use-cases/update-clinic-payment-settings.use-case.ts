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
  type IUpdateClinicPaymentSettingsUseCase,
  IUpdateClinicPaymentSettingsUseCase as IUpdateClinicPaymentSettingsUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/update-clinic-payment-settings.use-case.interface';
import {
  ClinicConfigurationVersion,
  UpdateClinicPaymentSettingsInput,
} from '../../../domain/clinic/types/clinic.types';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';
import { ClinicConfigurationValidator } from '../services/clinic-configuration-validator.service';

@Injectable()
export class UpdateClinicPaymentSettingsUseCase
  extends BaseUseCase<UpdateClinicPaymentSettingsInput, ClinicConfigurationVersion>
  implements IUpdateClinicPaymentSettingsUseCase
{
  protected readonly logger = new Logger(UpdateClinicPaymentSettingsUseCase.name);

  constructor(
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
    @Inject(IClinicConfigurationRepositoryToken)
    private readonly configurationRepository: IClinicConfigurationRepository,
    private readonly configurationValidator: ClinicConfigurationValidator,
  ) {
    super();
  }

  protected async handle(
    input: UpdateClinicPaymentSettingsInput,
  ): Promise<ClinicConfigurationVersion> {
    const clinic = await this.clinicRepository.findByTenant(input.tenantId, input.clinicId);

    if (!clinic) {
      throw ClinicErrorFactory.clinicNotFound('Clínica não encontrada');
    }

    const payload = JSON.parse(JSON.stringify(input.paymentSettings ?? {}));

    await this.configurationValidator.validatePaymentSettings(clinic, input.paymentSettings);

    const version = await this.configurationRepository.createVersion({
      clinicId: input.clinicId,
      tenantId: input.tenantId,
      section: 'payments',
      payload,
      createdBy: input.requestedBy,
      autoApply: true,
    });

    await this.configurationRepository.applyVersion({
      clinicId: input.clinicId,
      tenantId: input.tenantId,
      section: 'payments',
      versionId: version.id,
      appliedBy: input.requestedBy,
    });

    version.appliedAt = new Date();

    await this.clinicRepository.setCurrentConfigurationVersion({
      clinicId: input.clinicId,
      tenantId: input.tenantId,
      section: 'payments',
      versionId: version.id,
      updatedBy: input.requestedBy,
    });

    return version;
  }
}

export const UpdateClinicPaymentSettingsUseCaseToken = IUpdateClinicPaymentSettingsUseCaseToken;
