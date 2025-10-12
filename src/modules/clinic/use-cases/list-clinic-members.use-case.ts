import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import type { IClinicRepository } from '../../../domain/clinic/interfaces/repositories/clinic.repository.interface';
import { IClinicRepository as IClinicRepositoryToken } from '../../../domain/clinic/interfaces/repositories/clinic.repository.interface';
import type { IClinicMemberRepository } from '../../../domain/clinic/interfaces/repositories/clinic-member.repository.interface';
import { IClinicMemberRepository as IClinicMemberRepositoryToken } from '../../../domain/clinic/interfaces/repositories/clinic-member.repository.interface';
import type { IListClinicMembersUseCase } from '../../../domain/clinic/interfaces/use-cases/list-clinic-members.use-case.interface';
import { IListClinicMembersUseCase as IListClinicMembersUseCaseToken } from '../../../domain/clinic/interfaces/use-cases/list-clinic-members.use-case.interface';
import {
  ClinicMember,
  ClinicMemberStatus,
  ClinicStaffRole,
} from '../../../domain/clinic/types/clinic.types';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';

interface ListClinicMembersInput {
  clinicId: string;
  tenantId: string;
  status?: ClinicMemberStatus[];
  roles?: ClinicStaffRole[];
  page?: number;
  limit?: number;
}

@Injectable()
export class ListClinicMembersUseCase
  extends BaseUseCase<ListClinicMembersInput, { data: ClinicMember[]; total: number }>
  implements IListClinicMembersUseCase
{
  protected readonly logger = new Logger(ListClinicMembersUseCase.name);

  constructor(
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
    @Inject(IClinicMemberRepositoryToken)
    private readonly memberRepository: IClinicMemberRepository,
  ) {
    super();
  }

  protected async handle(
    input: ListClinicMembersInput,
  ): Promise<{ data: ClinicMember[]; total: number }> {
    const clinic = await this.clinicRepository.findByTenant(input.tenantId, input.clinicId);

    if (!clinic) {
      throw ClinicErrorFactory.clinicNotFound('Clínica não encontrada');
    }

    return this.memberRepository.listMembers(input);
  }
}

export const ListClinicMembersUseCaseToken = IListClinicMembersUseCaseToken;
