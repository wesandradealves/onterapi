import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import type { IClinicRepository } from '../../../domain/clinic/interfaces/repositories/clinic.repository.interface';
import { IClinicRepository as IClinicRepositoryToken } from '../../../domain/clinic/interfaces/repositories/clinic.repository.interface';
import type { IClinicMemberRepository } from '../../../domain/clinic/interfaces/repositories/clinic-member.repository.interface';
import { IClinicMemberRepository as IClinicMemberRepositoryToken } from '../../../domain/clinic/interfaces/repositories/clinic-member.repository.interface';
import type { IManageClinicMemberUseCase } from '../../../domain/clinic/interfaces/use-cases/manage-clinic-member.use-case.interface';
import { IManageClinicMemberUseCase as IManageClinicMemberUseCaseToken } from '../../../domain/clinic/interfaces/use-cases/manage-clinic-member.use-case.interface';
import { ClinicMember, ManageClinicMemberInput } from '../../../domain/clinic/types/clinic.types';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';

@Injectable()
export class ManageClinicMemberUseCase
  extends BaseUseCase<ManageClinicMemberInput, ClinicMember>
  implements IManageClinicMemberUseCase
{
  protected readonly logger = new Logger(ManageClinicMemberUseCase.name);

  constructor(
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
    @Inject(IClinicMemberRepositoryToken)
    private readonly memberRepository: IClinicMemberRepository,
  ) {
    super();
  }

  protected async handle(input: ManageClinicMemberInput): Promise<ClinicMember> {
    const clinic = await this.clinicRepository.findByTenant(input.tenantId, input.clinicId);

    if (!clinic) {
      throw ClinicErrorFactory.clinicNotFound('Clínica não encontrada');
    }

    const member = await this.memberRepository.findById(input.memberId);
    if (!member || member.clinicId !== input.clinicId) {
      throw ClinicErrorFactory.memberNotFound('Membro não encontrado');
    }

    return this.memberRepository.updateMember(input);
  }
}

export const ManageClinicMemberUseCaseToken = IManageClinicMemberUseCaseToken;
