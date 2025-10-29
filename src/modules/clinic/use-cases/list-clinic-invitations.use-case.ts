import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import {
  type IClinicRepository,
  IClinicRepository as IClinicRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic.repository.interface';
import {
  type IClinicInvitationRepository,
  IClinicInvitationRepository as IClinicInvitationRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-invitation.repository.interface';
import {
  type IListClinicInvitationsUseCase,
  IListClinicInvitationsUseCase as IListClinicInvitationsUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/list-clinic-invitations.use-case.interface';
import {
  ClinicInvitation,
  ClinicInvitationStatus,
} from '../../../domain/clinic/types/clinic.types';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';

interface ListClinicInvitationsInput {
  clinicId: string;
  tenantId: string;
  status?: ClinicInvitationStatus[];
  page?: number;
  limit?: number;
}

@Injectable()
export class ListClinicInvitationsUseCase
  extends BaseUseCase<ListClinicInvitationsInput, { data: ClinicInvitation[]; total: number }>
  implements IListClinicInvitationsUseCase
{
  protected readonly logger = new Logger(ListClinicInvitationsUseCase.name);

  constructor(
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
    @Inject(IClinicInvitationRepositoryToken)
    private readonly invitationRepository: IClinicInvitationRepository,
  ) {
    super();
  }

  protected async handle(
    input: ListClinicInvitationsInput,
  ): Promise<{ data: ClinicInvitation[]; total: number }> {
    const clinic = await this.clinicRepository.findByTenant(input.tenantId, input.clinicId);

    if (!clinic) {
      throw ClinicErrorFactory.clinicNotFound('Clinica nao encontrada');
    }

    return this.invitationRepository.listPending(input);
  }
}

export const ListClinicInvitationsUseCaseToken = IListClinicInvitationsUseCaseToken;
