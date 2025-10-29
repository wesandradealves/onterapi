import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import {
  type IClinicInvitationRepository,
  IClinicInvitationRepository as IClinicInvitationRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-invitation.repository.interface';
import {
  type IDeclineClinicInvitationUseCase,
  IDeclineClinicInvitationUseCase as IDeclineClinicInvitationUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/decline-clinic-invitation.use-case.interface';
import {
  ClinicInvitation,
  DeclineClinicInvitationInput,
} from '../../../domain/clinic/types/clinic.types';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';
import { ClinicAuditService } from '../../../infrastructure/clinic/services/clinic-audit.service';

@Injectable()
export class DeclineClinicInvitationUseCase
  extends BaseUseCase<DeclineClinicInvitationInput, ClinicInvitation>
  implements IDeclineClinicInvitationUseCase
{
  protected readonly logger = new Logger(DeclineClinicInvitationUseCase.name);

  constructor(
    @Inject(IClinicInvitationRepositoryToken)
    private readonly invitationRepository: IClinicInvitationRepository,
    private readonly auditService: ClinicAuditService,
  ) {
    super();
  }

  protected async handle(input: DeclineClinicInvitationInput): Promise<ClinicInvitation> {
    const invitation = await this.invitationRepository.findById(input.invitationId);

    if (!invitation || invitation.tenantId !== input.tenantId) {
      throw ClinicErrorFactory.invitationNotFound('Convite nao encontrado');
    }

    if (invitation.status !== 'pending') {
      throw ClinicErrorFactory.invitationAlreadyProcessed('Convite ja processado');
    }

    if (invitation.professionalId && invitation.professionalId !== input.declinedBy) {
      throw ClinicErrorFactory.invitationInvalidToken(
        'Convite nao pertence ao profissional informado',
      );
    }

    const declined = await this.invitationRepository.markDeclined({
      invitationId: input.invitationId,
      tenantId: input.tenantId,
      declinedBy: input.declinedBy,
    });

    await this.auditService.register({
      event: 'clinic.invitation.declined',
      clinicId: invitation.clinicId,
      tenantId: invitation.tenantId,
      performedBy: input.declinedBy,
      detail: {
        invitationId: invitation.id,
        professionalId: input.declinedBy,
        reason: input.reason,
      },
    });

    return declined;
  }
}

export const DeclineClinicInvitationUseCaseToken = IDeclineClinicInvitationUseCaseToken;
