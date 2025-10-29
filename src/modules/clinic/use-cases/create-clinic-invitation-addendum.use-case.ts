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
  type IClinicMemberRepository,
  IClinicMemberRepository as IClinicMemberRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-member.repository.interface';
import {
  type ICreateClinicInvitationAddendumUseCase,
  ICreateClinicInvitationAddendumUseCase as ICreateClinicInvitationAddendumUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/create-clinic-invitation-addendum.use-case.interface';
import {
  ClinicInvitation,
  CreateClinicInvitationAddendumInput,
} from '../../../domain/clinic/types/clinic.types';
import { ClinicInvitationTokenService } from '../services/clinic-invitation-token.service';
import { ClinicInvitationEconomicSummaryValidator } from '../services/clinic-invitation-economic-summary.validator';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';
import { ClinicAuditService } from '../../../infrastructure/clinic/services/clinic-audit.service';

@Injectable()
export class CreateClinicInvitationAddendumUseCase
  extends BaseUseCase<CreateClinicInvitationAddendumInput, ClinicInvitation>
  implements ICreateClinicInvitationAddendumUseCase
{
  protected readonly logger = new Logger(CreateClinicInvitationAddendumUseCase.name);

  constructor(
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
    @Inject(IClinicInvitationRepositoryToken)
    private readonly invitationRepository: IClinicInvitationRepository,
    @Inject(IClinicMemberRepositoryToken)
    private readonly memberRepository: IClinicMemberRepository,
    private readonly economicSummaryValidator: ClinicInvitationEconomicSummaryValidator,
    private readonly auditService: ClinicAuditService,
    private readonly invitationTokenService: ClinicInvitationTokenService,
  ) {
    super();
  }

  protected async handle(input: CreateClinicInvitationAddendumInput): Promise<ClinicInvitation> {
    this.invitationTokenService.assertSecretConfigured();

    const clinic = await this.clinicRepository.findByTenant(input.tenantId, input.clinicId);

    if (!clinic) {
      throw ClinicErrorFactory.clinicNotFound('Clinica nao encontrada');
    }

    const member = await this.memberRepository.findActiveByClinicAndUser({
      clinicId: input.clinicId,
      tenantId: input.tenantId,
      userId: input.professionalId,
    });

    if (!member) {
      throw ClinicErrorFactory.memberNotFound(
        'Profissional precisa estar ativo na clinica para receber aditivo',
      );
    }

    const alreadyPending = await this.invitationRepository.hasActiveInvitation({
      clinicId: input.clinicId,
      tenantId: input.tenantId,
      professionalId: input.professionalId,
    });

    if (alreadyPending) {
      throw ClinicErrorFactory.invitationAlreadyExists(
        'Ja existe um convite pendente para este profissional',
      );
    }

    if (input.expiresAt <= new Date()) {
      throw ClinicErrorFactory.invalidClinicData('Data de expiracao do aditivo deve ser futura');
    }

    await this.economicSummaryValidator.validate(
      input.clinicId,
      input.tenantId,
      input.economicSummary,
      { allowInactive: true },
    );

    const metadata: Record<string, unknown> = { ...(input.metadata ?? {}) };
    metadata.kind = 'addendum';
    if (input.effectiveAt) {
      metadata.addendum = {
        ...(typeof metadata.addendum === 'object' && metadata.addendum !== null
          ? metadata.addendum
          : {}),
        effectiveAt: input.effectiveAt.toISOString(),
      };
    }

    const placeholderHash = this.invitationTokenService.hash(
      `pending:${input.professionalId}:${Date.now()}`,
    );

    const invitation = await this.invitationRepository.create({
      clinicId: input.clinicId,
      tenantId: input.tenantId,
      issuedBy: input.issuedBy,
      professionalId: input.professionalId,
      email: undefined,
      channel: input.channel,
      channelScope: input.channelScope,
      economicSummary: input.economicSummary,
      expiresAt: input.expiresAt,
      metadata,
      tokenHash: placeholderHash,
    });

    const { token, hash } = this.invitationTokenService.generateToken({
      invitationId: invitation.id,
      clinicId: invitation.clinicId,
      tenantId: invitation.tenantId,
      professionalId: input.professionalId,
      expiresAt: input.expiresAt,
    });

    const refreshedInvitation = await this.invitationRepository.updateToken({
      invitationId: invitation.id,
      tenantId: invitation.tenantId,
      tokenHash: hash,
      expiresAt: input.expiresAt,
      channel: input.channel,
      channelScope: input.channelScope,
    });

    const baseMetadata: Record<string, unknown> = {
      ...(refreshedInvitation.metadata ?? {}),
      kind: 'addendum',
    };

    if (input.effectiveAt) {
      baseMetadata.addendum = {
        ...(typeof baseMetadata.addendum === 'object' && baseMetadata.addendum !== null
          ? baseMetadata.addendum
          : {}),
        effectiveAt: input.effectiveAt.toISOString(),
      };
    }

    const result = {
      ...refreshedInvitation,
      metadata: {
        ...baseMetadata,
        issuedToken: token,
      },
    };

    await this.auditService.register({
      event: 'clinic.invitation.addendum_issued',
      clinicId: invitation.clinicId,
      tenantId: invitation.tenantId,
      performedBy: input.issuedBy,
      detail: {
        invitationId: invitation.id,
        professionalId: input.professionalId,
        channel: input.channel,
        channelScope: input.channelScope,
        expiresAt: input.expiresAt,
        effectiveAt: input.effectiveAt ?? null,
      },
    });

    return result;
  }
}

export const CreateClinicInvitationAddendumUseCaseToken =
  ICreateClinicInvitationAddendumUseCaseToken;
