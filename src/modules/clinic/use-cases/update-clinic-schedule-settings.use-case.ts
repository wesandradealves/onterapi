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
  ) {
    super();
  }

  protected async handle(
    input: UpdateClinicScheduleSettingsInput,
  ): Promise<ClinicConfigurationVersion> {
    const clinic = await this.clinicRepository.findByTenant(input.tenantId, input.clinicId);

    if (!clinic) {
      throw ClinicErrorFactory.clinicNotFound('Clínica não encontrada');
    }

    const payload = JSON.parse(JSON.stringify(input.scheduleSettings ?? {}));

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

    await this.clinicRepository.setCurrentConfigurationVersion({
      clinicId: input.clinicId,
      tenantId: input.tenantId,
      section: 'schedule',
      versionId: version.id,
      updatedBy: input.requestedBy,
    });

    return version;
  }
}

export const UpdateClinicScheduleSettingsUseCaseToken = IUpdateClinicScheduleSettingsUseCaseToken;
