import { Inject, Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';

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

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const invitation = await this.invitationRepository.create({
      ...input,
      tokenHash,
    });

    const result = {
      ...invitation,
      metadata: {
        ...(invitation.metadata ?? {}),
        rawToken,
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
