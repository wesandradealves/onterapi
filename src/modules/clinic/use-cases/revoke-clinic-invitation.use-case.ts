import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import {
  type IClinicInvitationRepository,
  IClinicInvitationRepository as IClinicInvitationRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-invitation.repository.interface';
import {
  type IClinicRepository,
  IClinicRepository as IClinicRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic.repository.interface';
import {
  type IRevokeClinicInvitationUseCase,
  IRevokeClinicInvitationUseCase as IRevokeClinicInvitationUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/revoke-clinic-invitation.use-case.interface';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';
import {
  ClinicInvitation,
  RevokeClinicInvitationInput,
} from '../../../domain/clinic/types/clinic.types';

@Injectable()
export class RevokeClinicInvitationUseCase
  extends BaseUseCase<RevokeClinicInvitationInput, ClinicInvitation>
  implements IRevokeClinicInvitationUseCase
{
  protected readonly logger = new Logger(RevokeClinicInvitationUseCase.name);

  constructor(
    @Inject(IClinicInvitationRepositoryToken)
    private readonly invitationRepository: IClinicInvitationRepository,
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
  ) {
    super();
  }

  protected async handle(input: RevokeClinicInvitationInput): Promise<ClinicInvitation> {
    const invitation = await this.invitationRepository.findById(input.invitationId);

    if (!invitation || invitation.tenantId !== input.tenantId) {
      throw ClinicErrorFactory.invitationNotFound('Convite não encontrado');
    }

    if (invitation.status !== 'pending') {
      throw ClinicErrorFactory.invitationAlreadyProcessed('Convite já processado');
    }

    const clinic = await this.clinicRepository.findByTenant(input.tenantId, invitation.clinicId);
    if (!clinic) {
      throw ClinicErrorFactory.clinicNotFound('Clínica não encontrada');
    }

    return this.invitationRepository.markRevoked(input);
  }
}

export const RevokeClinicInvitationUseCaseToken = IRevokeClinicInvitationUseCaseToken;
