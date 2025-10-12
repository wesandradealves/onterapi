import { Inject, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';

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

    const hashedToken = createHash('sha256').update(input.token).digest('hex');
    if (hashedToken !== invitation.tokenHash) {
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

    return this.invitationRepository.markAccepted(input);
  }
}

export const AcceptClinicInvitationUseCaseToken = IAcceptClinicInvitationUseCaseToken;
