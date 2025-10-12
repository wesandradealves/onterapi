import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import {
  type IClinicRepository,
  IClinicRepository as IClinicRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic.repository.interface';
import {
  type IClinicServiceTypeRepository,
  IClinicServiceTypeRepository as IClinicServiceTypeRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-service-type.repository.interface';
import { RemoveClinicServiceTypeInput } from '../../../domain/clinic/types/clinic.types';
import {
  type IRemoveClinicServiceTypeUseCase,
  IRemoveClinicServiceTypeUseCase as IRemoveClinicServiceTypeUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/remove-clinic-service-type.use-case.interface';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';

@Injectable()
export class RemoveClinicServiceTypeUseCase
  extends BaseUseCase<RemoveClinicServiceTypeInput, void>
  implements IRemoveClinicServiceTypeUseCase
{
  protected readonly logger = new Logger(RemoveClinicServiceTypeUseCase.name);

  constructor(
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
    @Inject(IClinicServiceTypeRepositoryToken)
    private readonly serviceTypeRepository: IClinicServiceTypeRepository,
  ) {
    super();
  }

  protected async handle(input: RemoveClinicServiceTypeInput): Promise<void> {
    const clinic = await this.clinicRepository.findByTenant(input.tenantId, input.clinicId);

    if (!clinic) {
      throw ClinicErrorFactory.clinicNotFound('Clínica não encontrada');
    }

    const serviceType = await this.serviceTypeRepository.findById(
      input.clinicId,
      input.serviceTypeId,
    );

    if (!serviceType) {
      throw ClinicErrorFactory.serviceTypeNotFound('Tipo de serviço não encontrado');
    }

    await this.serviceTypeRepository.remove(input);
  }
}

export const RemoveClinicServiceTypeUseCaseToken = IRemoveClinicServiceTypeUseCaseToken;
