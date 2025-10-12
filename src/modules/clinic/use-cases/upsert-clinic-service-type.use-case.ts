import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import type { IClinicRepository } from '../../../domain/clinic/interfaces/repositories/clinic.repository.interface';
import { IClinicRepository as IClinicRepositoryToken } from '../../../domain/clinic/interfaces/repositories/clinic.repository.interface';
import type { IClinicServiceTypeRepository } from '../../../domain/clinic/interfaces/repositories/clinic-service-type.repository.interface';
import { IClinicServiceTypeRepository as IClinicServiceTypeRepositoryToken } from '../../../domain/clinic/interfaces/repositories/clinic-service-type.repository.interface';
import {
  ClinicServiceTypeDefinition,
  UpsertClinicServiceTypeInput,
} from '../../../domain/clinic/types/clinic.types';
import type { IUpsertClinicServiceTypeUseCase } from '../../../domain/clinic/interfaces/use-cases/upsert-clinic-service-type.use-case.interface';
import { IUpsertClinicServiceTypeUseCase as IUpsertClinicServiceTypeUseCaseToken } from '../../../domain/clinic/interfaces/use-cases/upsert-clinic-service-type.use-case.interface';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';

@Injectable()
export class UpsertClinicServiceTypeUseCase
  extends BaseUseCase<UpsertClinicServiceTypeInput, ClinicServiceTypeDefinition>
  implements IUpsertClinicServiceTypeUseCase
{
  protected readonly logger = new Logger(UpsertClinicServiceTypeUseCase.name);

  constructor(
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
    @Inject(IClinicServiceTypeRepositoryToken)
    private readonly serviceTypeRepository: IClinicServiceTypeRepository,
  ) {
    super();
  }

  protected async handle(
    input: UpsertClinicServiceTypeInput,
  ): Promise<ClinicServiceTypeDefinition> {
    const clinic = await this.clinicRepository.findByTenant(input.tenantId, input.clinicId);

    if (!clinic) {
      throw ClinicErrorFactory.clinicNotFound('Clínica não encontrada');
    }

    const servicePayload = {
      ...input.service,
      slug: input.service.slug.trim().toLowerCase(),
      isActive: input.service.isActive ?? true,
      requiresAnamnesis: input.service.requiresAnamnesis ?? false,
      enableOnlineScheduling: input.service.enableOnlineScheduling ?? true,
      requiredDocuments: input.service.requiredDocuments ?? [],
      customFields: input.service.customFields ?? [],
    };

    try {
      return await this.serviceTypeRepository.upsert({
        ...input,
        service: servicePayload,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('slug')) {
        throw ClinicErrorFactory.duplicateServiceType(
          'Slug de tipo de serviço já está em uso na clínica',
        );
      }

      throw error;
    }
  }
}

export const UpsertClinicServiceTypeUseCaseToken = IUpsertClinicServiceTypeUseCaseToken;
