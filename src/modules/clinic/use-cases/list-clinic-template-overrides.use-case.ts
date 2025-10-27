import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import {
  ClinicTemplateOverrideListResult,
  ListClinicTemplateOverridesInput,
} from '../../../domain/clinic/types/clinic.types';
import {
  type IClinicRepository,
  IClinicRepository as IClinicRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic.repository.interface';
import {
  type IClinicTemplateOverrideRepository,
  IClinicTemplateOverrideRepository as IClinicTemplateOverrideRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-template-override.repository.interface';
import {
  type IListClinicTemplateOverridesUseCase,
  IListClinicTemplateOverridesUseCase as IListClinicTemplateOverridesUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/list-clinic-template-overrides.use-case.interface';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';

@Injectable()
export class ListClinicTemplateOverridesUseCase
  extends BaseUseCase<ListClinicTemplateOverridesInput, ClinicTemplateOverrideListResult>
  implements IListClinicTemplateOverridesUseCase
{
  protected readonly logger = new Logger(ListClinicTemplateOverridesUseCase.name);

  constructor(
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
    @Inject(IClinicTemplateOverrideRepositoryToken)
    private readonly overrideRepository: IClinicTemplateOverrideRepository,
  ) {
    super();
  }

  protected async handle(
    input: ListClinicTemplateOverridesInput,
  ): Promise<ClinicTemplateOverrideListResult> {
    const clinic = await this.clinicRepository.findByTenant(input.tenantId, input.clinicId);

    if (!clinic) {
      throw ClinicErrorFactory.clinicNotFound('Clinica nao encontrada');
    }

    const page = input.page && input.page > 0 ? input.page : 1;
    const limitCandidate = input.limit && input.limit > 0 ? input.limit : 20;
    const limit = Math.min(limitCandidate, 100);

    return this.overrideRepository.list({
      tenantId: input.tenantId,
      clinicId: input.clinicId,
      section: input.section,
      includeSuperseded: input.includeSuperseded,
      page,
      limit,
    });
  }
}

export const ListClinicTemplateOverridesUseCaseToken = IListClinicTemplateOverridesUseCaseToken;
