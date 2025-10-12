import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import {
  type IClinicRepository,
  IClinicRepository as IClinicRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic.repository.interface';
import {
  type IListClinicsUseCase,
  IListClinicsUseCase as IListClinicsUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/list-clinics.use-case.interface';
import { Clinic, ClinicStatus } from '../../../domain/clinic/types/clinic.types';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';

interface ListClinicsInput {
  tenantId: string;
  status?: ClinicStatus[];
  search?: string;
  page?: number;
  limit?: number;
  includeDeleted?: boolean;
}

@Injectable()
export class ListClinicsUseCase
  extends BaseUseCase<ListClinicsInput, { data: Clinic[]; total: number }>
  implements IListClinicsUseCase
{
  protected readonly logger = new Logger(ListClinicsUseCase.name);

  constructor(
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
  ) {
    super();
  }

  protected async handle(input: ListClinicsInput): Promise<{ data: Clinic[]; total: number }> {
    if (!input.tenantId) {
      throw ClinicErrorFactory.invalidHoldWindow('Tenant não informado');
    }

    return this.clinicRepository.list({
      tenantId: input.tenantId,
      status: input.status,
      search: input.search,
      page: input.page,
      limit: input.limit,
      includeDeleted: input.includeDeleted,
    });
  }
}

export const ListClinicsUseCaseToken = IListClinicsUseCaseToken;
