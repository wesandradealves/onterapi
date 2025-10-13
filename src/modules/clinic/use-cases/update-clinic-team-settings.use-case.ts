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
  type IUpdateClinicTeamSettingsUseCase,
  IUpdateClinicTeamSettingsUseCase as IUpdateClinicTeamSettingsUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/update-clinic-team-settings.use-case.interface';
import {
  ClinicConfigurationVersion,
  UpdateClinicTeamSettingsInput,
} from '../../../domain/clinic/types/clinic.types';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';
import { ClinicConfigurationValidator } from '../services/clinic-configuration-validator.service';

@Injectable()
export class UpdateClinicTeamSettingsUseCase
  extends BaseUseCase<UpdateClinicTeamSettingsInput, ClinicConfigurationVersion>
  implements IUpdateClinicTeamSettingsUseCase
{
  protected readonly logger = new Logger(UpdateClinicTeamSettingsUseCase.name);

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
    input: UpdateClinicTeamSettingsInput,
  ): Promise<ClinicConfigurationVersion> {
    const clinic = await this.clinicRepository.findByTenant(input.tenantId, input.clinicId);

    if (!clinic) {
      throw ClinicErrorFactory.clinicNotFound('Clínica não encontrada');
    }

    await this.configurationValidator.validateTeamSettings(clinic, input.teamSettings);

    const payload = JSON.parse(JSON.stringify(input.teamSettings ?? {}));

    const version = await this.configurationRepository.createVersion({
      clinicId: input.clinicId,
      tenantId: input.tenantId,
      section: 'team',
      payload,
      createdBy: input.requestedBy,
      autoApply: true,
    });

    await this.configurationRepository.applyVersion({
      clinicId: input.clinicId,
      tenantId: input.tenantId,
      section: 'team',
      versionId: version.id,
      appliedBy: input.requestedBy,
    });

    version.appliedAt = new Date();

    await this.clinicRepository.setCurrentConfigurationVersion({
      clinicId: input.clinicId,
      tenantId: input.tenantId,
      section: 'team',
      versionId: version.id,
      updatedBy: input.requestedBy,
    });

    return version;
  }
}

export const UpdateClinicTeamSettingsUseCaseToken = IUpdateClinicTeamSettingsUseCaseToken;
