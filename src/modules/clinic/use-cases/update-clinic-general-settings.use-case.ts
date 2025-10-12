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
  ClinicConfigurationVersion,
  UpdateClinicGeneralSettingsInput,
} from '../../../domain/clinic/types/clinic.types';
import {
  type IUpdateClinicGeneralSettingsUseCase,
  IUpdateClinicGeneralSettingsUseCase as IUpdateClinicGeneralSettingsUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/update-clinic-general-settings.use-case.interface';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';
import { ClinicAuditService } from '../../../infrastructure/clinic/services/clinic-audit.service';

@Injectable()
export class UpdateClinicGeneralSettingsUseCase
  extends BaseUseCase<UpdateClinicGeneralSettingsInput, ClinicConfigurationVersion>
  implements IUpdateClinicGeneralSettingsUseCase
{
  protected readonly logger = new Logger(UpdateClinicGeneralSettingsUseCase.name);

  constructor(
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
    @Inject(IClinicConfigurationRepositoryToken)
    private readonly configurationRepository: IClinicConfigurationRepository,
    private readonly auditService: ClinicAuditService,
  ) {
    super();
  }

  protected async handle(
    input: UpdateClinicGeneralSettingsInput,
  ): Promise<ClinicConfigurationVersion> {
    const clinic = await this.clinicRepository.findByTenant(input.tenantId, input.clinicId);

    if (!clinic) {
      throw ClinicErrorFactory.clinicNotFound('Clínica não encontrada');
    }

    const payload = JSON.parse(JSON.stringify(input.settings ?? {}));

    const version = await this.configurationRepository.createVersion({
      clinicId: input.clinicId,
      tenantId: input.tenantId,
      section: 'general',
      payload,
      createdBy: input.requestedBy,
      autoApply: true,
    });

    await this.configurationRepository.applyVersion({
      clinicId: input.clinicId,
      tenantId: input.tenantId,
      section: 'general',
      versionId: version.id,
      appliedBy: input.requestedBy,
    });

    await this.clinicRepository.setCurrentConfigurationVersion({
      clinicId: input.clinicId,
      tenantId: input.tenantId,
      section: 'general',
      versionId: version.id,
      updatedBy: input.requestedBy,
    });

    await this.auditService.register({
      event: 'clinic.general_settings.updated',
      clinicId: input.clinicId,
      tenantId: input.tenantId,
      performedBy: input.requestedBy,
      detail: {
        versionId: version.id,
      },
    });

    return version;
  }
}

export const UpdateClinicGeneralSettingsUseCaseToken = IUpdateClinicGeneralSettingsUseCaseToken;
