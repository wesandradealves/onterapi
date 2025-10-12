import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import {
  type IClinicRepository,
  IClinicRepository as IClinicRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic.repository.interface';
import { Clinic, UpdateClinicHoldSettingsInput } from '../../../domain/clinic/types/clinic.types';
import {
  type IUpdateClinicHoldSettingsUseCase,
  IUpdateClinicHoldSettingsUseCase as IUpdateClinicHoldSettingsUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/update-clinic-hold-settings.use-case.interface';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';

@Injectable()
export class UpdateClinicHoldSettingsUseCase
  extends BaseUseCase<UpdateClinicHoldSettingsInput, Clinic>
  implements IUpdateClinicHoldSettingsUseCase
{
  protected readonly logger = new Logger(UpdateClinicHoldSettingsUseCase.name);

  constructor(
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
  ) {
    super();
  }

  protected async handle(input: UpdateClinicHoldSettingsInput): Promise<Clinic> {
    const clinic = await this.clinicRepository.findByTenant(input.tenantId, input.clinicId);

    if (!clinic) {
      throw ClinicErrorFactory.clinicNotFound('Clínica não encontrada');
    }

    const ttlMinutes = input.holdSettings.ttlMinutes;
    const minAdvance = input.holdSettings.minAdvanceMinutes;

    if (ttlMinutes <= 0 || minAdvance < 0) {
      throw ClinicErrorFactory.invalidHoldWindow('Configurações de hold inválidas');
    }

    return this.clinicRepository.updateHoldSettings(input);
  }
}

export const UpdateClinicHoldSettingsUseCaseToken = IUpdateClinicHoldSettingsUseCaseToken;
