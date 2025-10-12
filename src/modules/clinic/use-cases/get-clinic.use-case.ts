import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import {
  type IClinicRepository,
  IClinicRepository as IClinicRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic.repository.interface';
import {
  type IGetClinicUseCase,
  IGetClinicUseCase as IGetClinicUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/get-clinic.use-case.interface';
import { Clinic } from '../../../domain/clinic/types/clinic.types';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';

interface GetClinicInput {
  clinicId: string;
  tenantId: string;
}

@Injectable()
export class GetClinicUseCase
  extends BaseUseCase<GetClinicInput, Clinic>
  implements IGetClinicUseCase
{
  protected readonly logger = new Logger(GetClinicUseCase.name);

  constructor(
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
  ) {
    super();
  }

  protected async handle(input: GetClinicInput): Promise<Clinic> {
    const clinic = await this.clinicRepository.findByTenant(input.tenantId, input.clinicId);

    if (!clinic) {
      throw ClinicErrorFactory.clinicNotFound('Clínica não encontrada');
    }

    return clinic;
  }
}

export const GetClinicUseCaseToken = IGetClinicUseCaseToken;
