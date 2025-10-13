import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';

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
  type IClinicMemberRepository,
  IClinicMemberRepository as IClinicMemberRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-member.repository.interface';
import {
  type IInviteClinicProfessionalUseCase,
  IInviteClinicProfessionalUseCase as IInviteClinicProfessionalUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/invite-clinic-professional.use-case.interface';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';
import {
  ClinicInvitation,
  InviteClinicProfessionalInput,
} from '../../../domain/clinic/types/clinic.types';
import { ClinicAuditService } from '../../../infrastructure/clinic/services/clinic-audit.service';
import { ClinicInvitationTokenService } from '../services/clinic-invitation-token.service';

@Injectable()
export class InviteClinicProfessionalUseCase
  extends BaseUseCase<InviteClinicProfessionalInput, ClinicInvitation>
  implements IInviteClinicProfessionalUseCase
{
  protected readonly logger = new Logger(InviteClinicProfessionalUseCase.name);

  constructor(
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
    @Inject(IClinicInvitationRepositoryToken)
    private readonly invitationRepository: IClinicInvitationRepository,
    @Inject(IClinicMemberRepositoryToken)
    private readonly memberRepository: IClinicMemberRepository,
    private readonly auditService: ClinicAuditService,
    private readonly invitationTokenService: ClinicInvitationTokenService,
  ) {
    super();
  }

  protected async handle(input: InviteClinicProfessionalInput): Promise<ClinicInvitation> {
    const clinic = await this.clinicRepository.findByTenant(input.tenantId, input.clinicId);

    if (!clinic) {
      throw ClinicErrorFactory.clinicNotFound('Clínica não encontrada');
    }

    if (!input.professionalId && !input.email) {
      throw ClinicErrorFactory.invalidHoldWindow(
        'Convite deve conter um profissional ou email de destino',
      );
    }

    if (input.professionalId) {
      const existingMember = await this.memberRepository.findByUser(
        input.clinicId,
        input.professionalId,
      );
      if (existingMember) {
        throw ClinicErrorFactory.memberAlreadyExists('Profissional já faz parte da clínica');
      }
    }

    const hasInvitation = await this.invitationRepository.hasActiveInvitation({
      clinicId: input.clinicId,
      tenantId: input.tenantId,
      professionalId: input.professionalId,
      email: input.email,
    });

    if (hasInvitation) {
      throw ClinicErrorFactory.invitationAlreadyExists(
        'Já existe um convite ativo para este profissional',
      );
    }

    if (input.expiresAt <= new Date()) {
      throw ClinicErrorFactory.invalidClinicData('Data de expiração do convite deve ser futura');
    }

    const placeholderHash = this.invitationTokenService.hash(
      `pending:${randomBytes(8).toString('hex')}:${Date.now()}`,
    );

    const invitation = await this.invitationRepository.create({
      ...input,
      tokenHash: placeholderHash,
    });

    const { token, hash } = this.invitationTokenService.generateToken({
      invitationId: invitation.id,
      clinicId: input.clinicId,
      tenantId: input.tenantId,
      expiresAt: input.expiresAt,
    });

    const refreshedInvitation = await this.invitationRepository.updateToken({
      invitationId: invitation.id,
      tenantId: invitation.tenantId,
      tokenHash: hash,
      expiresAt: input.expiresAt,
      channel: input.channel,
    });

    const result = {
      ...refreshedInvitation,
      metadata: {
        ...(refreshedInvitation.metadata ?? {}),
        issuedToken: token,
      },
    };

    await this.auditService.register({
      event: 'clinic.invitation.issued',
      clinicId: input.clinicId,
      tenantId: input.tenantId,
      performedBy: input.issuedBy,
      detail: {
        invitationId: invitation.id,
        professionalId: input.professionalId,
        channel: input.channel,
        expiresAt: input.expiresAt,
      },
    });

    return result;
  }
}

export const InviteClinicProfessionalUseCaseToken = IInviteClinicProfessionalUseCaseToken;
