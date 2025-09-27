import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import { IListAnamnesesByPatientUseCase } from '../../../domain/anamnesis/interfaces/use-cases/list-anamneses-by-patient.use-case.interface';
import {
  IAnamnesisRepository,
  IAnamnesisRepositoryToken,
} from '../../../domain/anamnesis/interfaces/repositories/anamnesis.repository.interface';
import {
  AnamnesisListFilters,
  AnamnesisListItem,
} from '../../../domain/anamnesis/types/anamnesis.types';
import { AnamnesisErrorFactory } from '../../../shared/factories/anamnesis-error.factory';
import { mapRoleToDomain } from '../../../shared/utils/role.utils';
import { RolesEnum } from '../../../domain/auth/enums/roles.enum';

interface ListByPatientQuery {
  tenantId: string;
  patientId: string;
  requesterId: string;
  requesterRole: string;
  filters?: AnamnesisListFilters;
}

@Injectable()
export class ListAnamnesesByPatientUseCase
  extends BaseUseCase<ListByPatientQuery, AnamnesisListItem[]>
  implements IListAnamnesesByPatientUseCase
{
  protected readonly logger = new Logger(ListAnamnesesByPatientUseCase.name);

  constructor(
    @Inject(IAnamnesisRepositoryToken)
    private readonly anamnesisRepository: IAnamnesisRepository,
  ) {
    super();
  }

  protected async handle(params: ListByPatientQuery): Promise<AnamnesisListItem[]> {
    const role = mapRoleToDomain(params.requesterRole);

    if (!role) {
      throw AnamnesisErrorFactory.unauthorized();
    }

    const filters = { ...(params.filters ?? {}) };

    if ([RolesEnum.SUPER_ADMIN, RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER].includes(role)) {
      // elevated roles can list all anamneses for the patient
    } else if (role === RolesEnum.PROFESSIONAL) {
      filters.professionalId = params.requesterId;
    } else if (role === RolesEnum.PATIENT) {
      if (params.patientId !== params.requesterId) {
        throw AnamnesisErrorFactory.unauthorized();
      }
    } else {
      throw AnamnesisErrorFactory.unauthorized();
    }

    return this.anamnesisRepository.listByPatient(params.tenantId, params.patientId, filters);
  }
}
