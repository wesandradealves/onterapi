import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import { IListPatientsUseCase } from '../../../domain/patients/interfaces/use-cases/list-patients.use-case.interface';
import {
  IPatientRepository,
  IPatientRepositoryToken,
} from '../../../domain/patients/interfaces/repositories/patient.repository.interface';
import { PatientListFilters, PatientListItem } from '../../../domain/patients/types/patient.types';

import { RolesEnum } from '../../../domain/auth/enums/roles.enum';
import { mapRoleToDomain } from '../../../shared/utils/role.utils';

@Injectable()
export class ListPatientsUseCase
  extends BaseUseCase<
    {
      tenantId: string;
      requesterId: string;
      requesterRole: string;
      filters?: PatientListFilters;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
    { data: PatientListItem[]; total: number }
  >
  implements IListPatientsUseCase
{
  protected readonly logger = new Logger(ListPatientsUseCase.name);

  constructor(
    @Inject(IPatientRepositoryToken)
    private readonly patientRepository: IPatientRepository,
  ) {
    super();
  }

  protected async handle(params: {
    tenantId: string;
    requesterId: string;
    requesterRole: string;
    filters?: PatientListFilters;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ data: PatientListItem[]; total: number }> {
    const { tenantId, requesterId, requesterRole } = params;
    const filters = { ...(params.filters ?? {}) };

    const role = mapRoleToDomain(requesterRole);
    if (role === RolesEnum.PROFESSIONAL) {
      filters.assignedProfessionalIds = [requesterId];
    }

    const result = await this.patientRepository.findAll({
      tenantId,
      filters,
      page: params.page,
      limit: params.limit,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    });

    return result;
  }
}

