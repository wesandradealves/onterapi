import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import type { IClinicRepository } from '../../../domain/clinic/interfaces/repositories/clinic.repository.interface';
import { IClinicRepository as IClinicRepositoryToken } from '../../../domain/clinic/interfaces/repositories/clinic.repository.interface';
import type { IClinicServiceTypeRepository } from '../../../domain/clinic/interfaces/repositories/clinic-service-type.repository.interface';
import { IClinicServiceTypeRepository as IClinicServiceTypeRepositoryToken } from '../../../domain/clinic/interfaces/repositories/clinic-service-type.repository.interface';
import { ClinicServiceTypeDefinition } from '../../../domain/clinic/types/clinic.types';
import type { IListClinicServiceTypesUseCase } from '../../../domain/clinic/interfaces/use-cases/list-clinic-service-types.use-case.interface';
import { IListClinicServiceTypesUseCase as IListClinicServiceTypesUseCaseToken } from '../../../domain/clinic/interfaces/use-cases/list-clinic-service-types.use-case.interface';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';

interface ListClinicServiceTypesInput {
  clinicId: string;
  tenantId: string;
  includeInactive?: boolean;
}

@Injectable()
export class ListClinicServiceTypesUseCase
  extends BaseUseCase<ListClinicServiceTypesInput, ClinicServiceTypeDefinition[]>
  implements IListClinicServiceTypesUseCase
{
  protected readonly logger = new Logger(ListClinicServiceTypesUseCase.name);

  constructor(
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
    @Inject(IClinicServiceTypeRepositoryToken)
    private readonly serviceTypeRepository: IClinicServiceTypeRepository,
  ) {
    super();
  }

  protected async handle(
    input: ListClinicServiceTypesInput,
  ): Promise<ClinicServiceTypeDefinition[]> {
    const clinic = await this.clinicRepository.findByTenant(input.tenantId, input.clinicId);

    if (!clinic) {
      throw ClinicErrorFactory.clinicNotFound('Clínica não encontrada');
    }

    return this.serviceTypeRepository.list({
      clinicId: input.clinicId,
      tenantId: input.tenantId,
      includeInactive: input.includeInactive,
    });
  }
}

export const ListClinicServiceTypesUseCaseToken = IListClinicServiceTypesUseCaseToken;
