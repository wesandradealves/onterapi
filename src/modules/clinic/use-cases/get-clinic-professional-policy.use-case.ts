import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import {
  type IClinicProfessionalPolicyRepository,
  IClinicProfessionalPolicyRepository as IClinicProfessionalPolicyRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-professional-policy.repository.interface';
import {
  type GetClinicProfessionalPolicyInput,
  type IGetClinicProfessionalPolicyUseCase,
  IGetClinicProfessionalPolicyUseCase as IGetClinicProfessionalPolicyUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/get-clinic-professional-policy.use-case.interface';
import { ClinicProfessionalPolicy } from '../../../domain/clinic/types/clinic.types';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';

@Injectable()
export class GetClinicProfessionalPolicyUseCase
  extends BaseUseCase<GetClinicProfessionalPolicyInput, ClinicProfessionalPolicy>
  implements IGetClinicProfessionalPolicyUseCase
{
  protected readonly logger = new Logger(GetClinicProfessionalPolicyUseCase.name);

  constructor(
    @Inject(IClinicProfessionalPolicyRepositoryToken)
    private readonly policyRepository: IClinicProfessionalPolicyRepository,
  ) {
    super();
  }

  protected async handle(
    input: GetClinicProfessionalPolicyInput,
  ): Promise<ClinicProfessionalPolicy> {
    const policy = await this.policyRepository.findActivePolicy({
      clinicId: input.clinicId,
      tenantId: input.tenantId,
      professionalId: input.professionalId,
    });

    if (!policy) {
      throw ClinicErrorFactory.professionalPolicyNotFound(
        'Politica clinica-profissional nao encontrada para o profissional informado',
      );
    }

    return policy;
  }
}

export const GetClinicProfessionalPolicyUseCaseToken = IGetClinicProfessionalPolicyUseCaseToken;
