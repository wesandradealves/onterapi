import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import {
  type IClinicRepository,
  IClinicRepository as IClinicRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic.repository.interface';
import {
  type IUpdateClinicStatusUseCase,
  IUpdateClinicStatusUseCase as IUpdateClinicStatusUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/update-clinic-status.use-case.interface';
import { Clinic, ClinicStatus } from '../../../domain/clinic/types/clinic.types';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';

interface UpdateClinicStatusInput {
  tenantId: string;
  clinicId: string;
  status: ClinicStatus;
  updatedBy: string;
}

@Injectable()
export class UpdateClinicStatusUseCase
  extends BaseUseCase<UpdateClinicStatusInput, Clinic>
  implements IUpdateClinicStatusUseCase
{
  protected readonly logger = new Logger(UpdateClinicStatusUseCase.name);

  constructor(
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
  ) {
    super();
  }

  protected async handle(input: UpdateClinicStatusInput): Promise<Clinic> {
    const clinic = await this.clinicRepository.findByTenant(input.tenantId, input.clinicId);

    if (!clinic) {
      throw ClinicErrorFactory.clinicNotFound('Clínica não encontrada');
    }

    if (clinic.status === input.status) {
      return clinic;
    }

    return this.clinicRepository.updateStatus({
      clinicId: input.clinicId,
      tenantId: input.tenantId,
      status: input.status,
      updatedBy: input.updatedBy,
    });
  }
}

export const UpdateClinicStatusUseCaseToken = IUpdateClinicStatusUseCaseToken;
