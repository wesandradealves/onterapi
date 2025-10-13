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
  type IClinicMemberRepository,
  IClinicMemberRepository as IClinicMemberRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-member.repository.interface';
import {
  type IAcceptClinicInvitationUseCase,
  IAcceptClinicInvitationUseCase as IAcceptClinicInvitationUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/accept-clinic-invitation.use-case.interface';
import {
  AcceptClinicInvitationInput,
  ClinicInvitation,
} from '../../../domain/clinic/types/clinic.types';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';
import { RolesEnum } from '../../../domain/auth/enums/roles.enum';
import { ClinicAuditService } from '../../../infrastructure/clinic/services/clinic-audit.service';
import { ClinicInvitationTokenService } from '../services/clinic-invitation-token.service';

@Injectable()
export class AcceptClinicInvitationUseCase
  extends BaseUseCase<AcceptClinicInvitationInput, ClinicInvitation>
  implements IAcceptClinicInvitationUseCase
{
  protected readonly logger = new Logger(AcceptClinicInvitationUseCase.name);

  constructor(
    @Inject(IClinicInvitationRepositoryToken)
    private readonly invitationRepository: IClinicInvitationRepository,
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
    @Inject(IClinicMemberRepositoryToken)
    private readonly memberRepository: IClinicMemberRepository,
    private readonly auditService: ClinicAuditService,
    private readonly invitationTokenService: ClinicInvitationTokenService,
  ) {
    super();
  }

  protected async handle(
    input: AcceptClinicInvitationInput & { token: string },
  ): Promise<ClinicInvitation> {
    const invitation = await this.invitationRepository.findById(input.invitationId);

    if (!invitation || invitation.tenantId !== input.tenantId) {
      throw ClinicErrorFactory.invitationNotFound('Convite não encontrado');
    }

    if (invitation.status !== 'pending') {
      throw ClinicErrorFactory.invitationAlreadyProcessed('Convite já processado');
    }

    if (invitation.expiresAt < new Date()) {
      throw ClinicErrorFactory.invitationExpired('Convite expirado');
    }

    const decodedToken = this.invitationTokenService.verifyToken(input.token);

    if (decodedToken.invitationId !== invitation.id) {
      throw ClinicErrorFactory.invitationInvalidToken('Token não corresponde ao convite fornecido');
    }

    if (decodedToken.clinicId !== invitation.clinicId) {
      throw ClinicErrorFactory.invitationInvalidToken('Token não pertence à clínica informada');
    }

    if (decodedToken.tenantId !== invitation.tenantId) {
      throw ClinicErrorFactory.invitationInvalidToken('Token não pertence ao tenant informado');
    }

    if (decodedToken.hash !== invitation.tokenHash) {
      throw ClinicErrorFactory.invitationInvalidToken('Token inválido para o convite');
    }

    const clinic = await this.clinicRepository.findByTenant(
      invitation.tenantId,
      invitation.clinicId,
    );
    if (!clinic) {
      throw ClinicErrorFactory.clinicNotFound('Clínica não encontrada');
    }

    const existingMember = await this.memberRepository.findByUser(
      invitation.clinicId,
      input.acceptedBy,
    );
    if (existingMember) {
      throw ClinicErrorFactory.memberAlreadyExists('Profissional já vinculado à clínica');
    }

    await this.memberRepository.addMember({
      clinicId: invitation.clinicId,
      tenantId: invitation.tenantId,
      performedBy: input.acceptedBy,
      userId: input.acceptedBy,
      role: RolesEnum.PROFESSIONAL,
      status: 'active',
      scope: [],
      joinedAt: new Date(),
    });

    const accepted = await this.invitationRepository.markAccepted(input);

    await this.auditService.register({
      event: 'clinic.invitation.accepted',
      clinicId: invitation.clinicId,
      tenantId: invitation.tenantId,
      performedBy: input.acceptedBy,
      detail: {
        invitationId: invitation.id,
      },
    });

    return accepted;
  }
}

export const AcceptClinicInvitationUseCaseToken = IAcceptClinicInvitationUseCaseToken;
