import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import {
  type IClinicInvitationRepository,
  IClinicInvitationRepository as IClinicInvitationRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-invitation.repository.interface';
import {
  type IReissueClinicInvitationUseCase,
  IReissueClinicInvitationUseCase as IReissueClinicInvitationUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/reissue-clinic-invitation.use-case.interface';
import { ClinicAuditService } from '../../../infrastructure/clinic/services/clinic-audit.service';
import {
  ClinicInvitation,
  ReissueClinicInvitationInput,
} from '../../../domain/clinic/types/clinic.types';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';
import { ClinicInvitationTokenService } from '../services/clinic-invitation-token.service';

const REISSUE_ELIGIBLE_STATUSES: Array<ClinicInvitation['status']> = [
  'pending',
  'expired',
  'revoked',
];

@Injectable()
export class ReissueClinicInvitationUseCase
  extends BaseUseCase<ReissueClinicInvitationInput, ClinicInvitation>
  implements IReissueClinicInvitationUseCase
{
  protected readonly logger = new Logger(ReissueClinicInvitationUseCase.name);

  constructor(
    @Inject(IClinicInvitationRepositoryToken)
    private readonly invitationRepository: IClinicInvitationRepository,
    private readonly auditService: ClinicAuditService,
    private readonly invitationTokenService: ClinicInvitationTokenService,
  ) {
    super();
  }

  protected async handle(input: ReissueClinicInvitationInput): Promise<ClinicInvitation> {
    const invitation = await this.invitationRepository.findById(input.invitationId);

    if (!invitation || invitation.tenantId !== input.tenantId) {
      throw ClinicErrorFactory.invitationNotFound('Convite não encontrado para reenvio');
    }

    if (!REISSUE_ELIGIBLE_STATUSES.includes(invitation.status)) {
      throw ClinicErrorFactory.invitationAlreadyProcessed(
        `Convite em estado ${invitation.status} não pode ser reenviado`,
      );
    }

    if (input.expiresAt <= new Date()) {
      throw ClinicErrorFactory.invalidClinicData('Data de expiração deve ser futura');
    }

    const { token, hash } = this.invitationTokenService.generateToken({
      invitationId: invitation.id,
      clinicId: invitation.clinicId,
      tenantId: invitation.tenantId,
      expiresAt: input.expiresAt,
    });

    const refreshed = await this.invitationRepository.updateToken({
      invitationId: invitation.id,
      tenantId: invitation.tenantId,
      tokenHash: hash,
      expiresAt: input.expiresAt,
      channel: input.channel,
    });

    const result = {
      ...refreshed,
      metadata: {
        ...(refreshed.metadata ?? {}),
        issuedToken: token,
      },
    };

    await this.auditService.register({
      event: 'clinic.invitation.reissued',
      clinicId: invitation.clinicId,
      tenantId: invitation.tenantId,
      performedBy: input.reissuedBy,
      detail: {
        invitationId: invitation.id,
        previousStatus: invitation.status,
        newExpiration: input.expiresAt,
        channel: input.channel ?? invitation.channel,
      },
    });

    return result;
  }
}

export const ReissueClinicInvitationUseCaseToken = IReissueClinicInvitationUseCaseToken;
