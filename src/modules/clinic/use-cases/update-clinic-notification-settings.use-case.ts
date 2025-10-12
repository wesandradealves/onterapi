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
  type IUpdateClinicNotificationSettingsUseCase,
  IUpdateClinicNotificationSettingsUseCase as IUpdateClinicNotificationSettingsUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/update-clinic-notification-settings.use-case.interface';
import {
  ClinicConfigurationVersion,
  UpdateClinicNotificationSettingsInput,
} from '../../../domain/clinic/types/clinic.types';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';

@Injectable()
export class UpdateClinicNotificationSettingsUseCase
  extends BaseUseCase<UpdateClinicNotificationSettingsInput, ClinicConfigurationVersion>
  implements IUpdateClinicNotificationSettingsUseCase
{
  protected readonly logger = new Logger(UpdateClinicNotificationSettingsUseCase.name);

  constructor(
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
    @Inject(IClinicConfigurationRepositoryToken)
    private readonly configurationRepository: IClinicConfigurationRepository,
  ) {
    super();
  }

  protected async handle(
    input: UpdateClinicNotificationSettingsInput,
  ): Promise<ClinicConfigurationVersion> {
    const clinic = await this.clinicRepository.findByTenant(input.tenantId, input.clinicId);

    if (!clinic) {
      throw ClinicErrorFactory.clinicNotFound('Clínica não encontrada');
    }

    const payload = JSON.parse(JSON.stringify(input.notificationSettings ?? {}));

    const version = await this.configurationRepository.createVersion({
      clinicId: input.clinicId,
      tenantId: input.tenantId,
      section: 'notifications',
      payload,
      createdBy: input.requestedBy,
      autoApply: true,
    });

    await this.configurationRepository.applyVersion({
      clinicId: input.clinicId,
      tenantId: input.tenantId,
      section: 'notifications',
      versionId: version.id,
      appliedBy: input.requestedBy,
    });

    await this.clinicRepository.setCurrentConfigurationVersion({
      clinicId: input.clinicId,
      tenantId: input.tenantId,
      section: 'notifications',
      versionId: version.id,
      updatedBy: input.requestedBy,
    });

    return version;
  }
}

export const UpdateClinicNotificationSettingsUseCaseToken =
  IUpdateClinicNotificationSettingsUseCaseToken;
