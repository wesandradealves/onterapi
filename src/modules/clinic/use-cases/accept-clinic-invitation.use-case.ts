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
  type IClinicConfigurationRepository,
  IClinicConfigurationRepository as IClinicConfigurationRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-configuration.repository.interface';
import {
  type IClinicAppointmentRepository,
  IClinicAppointmentRepository as IClinicAppointmentRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-appointment.repository.interface';
import {
  type IAcceptClinicInvitationUseCase,
  IAcceptClinicInvitationUseCase as IAcceptClinicInvitationUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/accept-clinic-invitation.use-case.interface';
import {
  AcceptClinicInvitationInput,
  ClinicInvitation,
  ClinicPaymentStatus,
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
    @Inject(IClinicConfigurationRepositoryToken)
    private readonly configurationRepository: IClinicConfigurationRepository,
    @Inject(IClinicAppointmentRepositoryToken)
    private readonly appointmentRepository: IClinicAppointmentRepository,
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
      throw ClinicErrorFactory.invitationNotFound('Convite nao encontrado');
    }

    if (invitation.status !== 'pending') {
      throw ClinicErrorFactory.invitationAlreadyProcessed('Convite ja processado');
    }

    if (invitation.expiresAt < new Date()) {
      throw ClinicErrorFactory.invitationExpired('Convite expirado');
    }

    const decodedToken = this.invitationTokenService.verifyToken(input.token);

    if (decodedToken.invitationId !== invitation.id) {
      throw ClinicErrorFactory.invitationInvalidToken('Token nao corresponde ao convite fornecido');
    }

    if (decodedToken.clinicId !== invitation.clinicId) {
      throw ClinicErrorFactory.invitationInvalidToken('Token nao pertence a clinica informada');
    }

    if (decodedToken.tenantId !== invitation.tenantId) {
      throw ClinicErrorFactory.invitationInvalidToken('Token nao pertence ao tenant informado');
    }

    if (decodedToken.hash !== invitation.tokenHash) {
      throw ClinicErrorFactory.invitationInvalidToken('Token invalido para o convite');
    }

    const clinic = await this.clinicRepository.findByTenant(
      invitation.tenantId,
      invitation.clinicId,
    );
    if (!clinic) {
      throw ClinicErrorFactory.clinicNotFound('Clinica nao encontrada');
    }

    const existingMember = await this.memberRepository.findByUser(
      invitation.clinicId,
      input.acceptedBy,
    );
    if (existingMember) {
      throw ClinicErrorFactory.memberAlreadyExists('Profissional ja vinculado a clinica');
    }

    const professionalId = invitation.professionalId ?? input.acceptedBy;

    if (professionalId) {
      const requireClearance = await this.requiresFinancialClearance(invitation.clinicId);

      if (requireClearance) {
        const hasPendencies = await this.hasFinancialPendencies({
          clinicId: invitation.clinicId,
          tenantId: invitation.tenantId,
          professionalId,
        });

        if (hasPendencies) {
          throw ClinicErrorFactory.pendingFinancialObligations(
            'Profissional possui pendencias financeiras com a clinica',
          );
        }
      }
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
        professionalId: input.acceptedBy,
        economicSnapshot: this.cloneEconomicSnapshot(
          accepted.acceptedEconomicSnapshot ?? accepted.economicSummary,
        ),
      },
    });

    return accepted;
  }

  private async requiresFinancialClearance(clinicId: string): Promise<boolean> {
    const version = await this.configurationRepository.findLatestAppliedVersion(clinicId, 'team');

    if (!version || !version.payload || typeof version.payload !== 'object') {
      return false;
    }

    const payload = version.payload as Record<string, unknown>;
    const directValue = payload.requireFinancialClearance;

    if (typeof directValue === 'boolean') {
      return directValue;
    }

    const nested = payload.teamSettings;
    if (nested && typeof nested === 'object') {
      const nestedValue = (nested as Record<string, unknown>).requireFinancialClearance;
      if (typeof nestedValue === 'boolean') {
        return nestedValue;
      }
    }

    return false;
  }

  private async hasFinancialPendencies(params: {
    clinicId: string;
    tenantId: string;
    professionalId: string;
  }): Promise<boolean> {
    const statuses: ClinicPaymentStatus[] = ['chargeback', 'failed'];

    const count = await this.appointmentRepository.countByProfessionalAndPaymentStatus({
      clinicId: params.clinicId,
      tenantId: params.tenantId,
      professionalId: params.professionalId,
      statuses,
    });

    return count > 0;
  }

  private cloneEconomicSnapshot(
    snapshot: ClinicInvitation['economicSummary'],
  ): ClinicInvitation['economicSummary'] {
    return JSON.parse(JSON.stringify(snapshot));
  }
}

export const AcceptClinicInvitationUseCaseToken = IAcceptClinicInvitationUseCaseToken;
