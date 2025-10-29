import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import { IListAnamnesisStepTemplatesUseCase } from '../../../domain/anamnesis/interfaces/use-cases/list-anamnesis-step-templates.use-case.interface';
import {
  IAnamnesisRepository,
  IAnamnesisRepositoryToken,
} from '../../../domain/anamnesis/interfaces/repositories/anamnesis.repository.interface';
import {
  AnamnesisStepTemplate,
  GetStepTemplatesFilters,
} from '../../../domain/anamnesis/types/anamnesis.types';
import { mapRoleToDomain } from '../../../shared/utils/role.utils';
import { RolesEnum } from '../../../domain/auth/enums/roles.enum';
import { AnamnesisErrorFactory } from '../../../shared/factories/anamnesis-error.factory';

interface ListStepTemplatesParams {
  tenantId: string;
  requesterId: string;
  requesterRole: string;
  filters?: GetStepTemplatesFilters;
}

@Injectable()
export class ListAnamnesisStepTemplatesUseCase
  extends BaseUseCase<ListStepTemplatesParams, AnamnesisStepTemplate[]>
  implements IListAnamnesisStepTemplatesUseCase
{
  protected readonly logger = new Logger(ListAnamnesisStepTemplatesUseCase.name);

  constructor(
    @Inject(IAnamnesisRepositoryToken)
    private readonly anamnesisRepository: IAnamnesisRepository,
  ) {
    super();
  }

  protected async handle(params: ListStepTemplatesParams): Promise<AnamnesisStepTemplate[]> {
    const role = mapRoleToDomain(params.requesterRole);

    if (!role) {
      throw AnamnesisErrorFactory.unauthorized();
    }

    const allowedRoles: RolesEnum[] = [
      RolesEnum.SUPER_ADMIN,
      RolesEnum.CLINIC_OWNER,
      RolesEnum.MANAGER,
      RolesEnum.PROFESSIONAL,
      RolesEnum.PATIENT,
    ];

    if (!allowedRoles.includes(role)) {
      throw AnamnesisErrorFactory.unauthorized();
    }

    const filters: GetStepTemplatesFilters = {
      tenantId: params.tenantId,
      specialty: params.filters?.specialty,
      includeInactive:
        role === RolesEnum.SUPER_ADMIN ? (params.filters?.includeInactive ?? false) : false,
    };

    return this.anamnesisRepository.getStepTemplates(filters);
  }
}
