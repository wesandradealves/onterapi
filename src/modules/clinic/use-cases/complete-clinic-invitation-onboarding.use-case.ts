import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import {
  IClinicInvitationRepository,
  IClinicInvitationRepository as IClinicInvitationRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-invitation.repository.interface';
import {
  CompleteClinicInvitationOnboardingInput,
  CompleteClinicInvitationOnboardingOutput,
  ICompleteClinicInvitationOnboardingUseCase,
  ICompleteClinicInvitationOnboardingUseCase as ICompleteClinicInvitationOnboardingUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/complete-clinic-invitation-onboarding.use-case.interface';
import { ClinicInvitationTokenService } from '../services/clinic-invitation-token.service';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';
import { IUserRepository } from '../../../domain/users/interfaces/repositories/user.repository.interface';
import { ICreateUserUseCase } from '../../../domain/users/interfaces/use-cases/create-user.use-case.interface';
import {
  type IAcceptClinicInvitationUseCase,
  IAcceptClinicInvitationUseCase as IAcceptClinicInvitationUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/accept-clinic-invitation.use-case.interface';
import { ClinicAuditService } from '../../../infrastructure/clinic/services/clinic-audit.service';
import { RolesEnum } from '../../../domain/auth/enums/roles.enum';
import { CPFValidator } from '../../../shared/validators/cpf.validator';

@Injectable()
export class CompleteClinicInvitationOnboardingUseCase
  extends BaseUseCase<
    CompleteClinicInvitationOnboardingInput,
    CompleteClinicInvitationOnboardingOutput
  >
  implements ICompleteClinicInvitationOnboardingUseCase
{
  protected readonly logger = new Logger(CompleteClinicInvitationOnboardingUseCase.name);

  constructor(
    @Inject(IClinicInvitationRepositoryToken)
    private readonly invitationRepository: IClinicInvitationRepository,
    private readonly tokenService: ClinicInvitationTokenService,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('ICreateUserUseCase')
    private readonly createUserUseCase: ICreateUserUseCase,
    @Inject(IAcceptClinicInvitationUseCaseToken)
    private readonly acceptInvitationUseCase: IAcceptClinicInvitationUseCase,
    private readonly auditService: ClinicAuditService,
  ) {
    super();
  }

  protected async handle(
    input: CompleteClinicInvitationOnboardingInput,
  ): Promise<CompleteClinicInvitationOnboardingOutput> {
    const invitation = await this.invitationRepository.findById(input.invitationId);

    if (!invitation || invitation.tenantId !== input.tenantId) {
      throw ClinicErrorFactory.invitationNotFound('Convite nao encontrado');
    }

    if (invitation.status !== 'pending') {
      throw ClinicErrorFactory.invitationAlreadyProcessed('Convite ja processado');
    }

    if (!invitation.targetEmail) {
      throw ClinicErrorFactory.invitationOnboardingNotSupported(
        'Convite nao possui contato de e-mail para onboarding automatico',
      );
    }

    if (invitation.professionalId) {
      throw ClinicErrorFactory.invitationOnboardingNotSupported(
        'Convite ja vinculado a profissional existente. Utilize o fluxo autenticado.',
      );
    }

    if (invitation.expiresAt < new Date()) {
      throw ClinicErrorFactory.invitationExpired('Convite expirado');
    }

    const decodedToken = this.tokenService.verifyToken(input.token);

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

    const invitationEmail = invitation.targetEmail.trim().toLowerCase();
    const tokenEmail = decodedToken.targetEmail?.trim().toLowerCase();

    if (!tokenEmail || tokenEmail !== invitationEmail) {
      throw ClinicErrorFactory.invitationInvalidToken('Token nao corresponde ao contato convidado');
    }

    const cleanCpf = CPFValidator.clean(input.cpf);

    if (!CPFValidator.isValid(cleanCpf)) {
      throw ClinicErrorFactory.invalidClinicData('CPF informado invalido para o profissional');
    }

    const existingUserByEmail = await this.userRepository.findByEmail(invitationEmail);
    if (existingUserByEmail) {
      throw ClinicErrorFactory.invitationOnboardingUserExists(
        'Email ja cadastrado. Utilize seu acesso existente para aceitar o convite.',
      );
    }

    const existingUserByCpf = await this.userRepository.findByCpf(cleanCpf);
    if (existingUserByCpf) {
      throw ClinicErrorFactory.invitationOnboardingUserExists(
        'CPF ja cadastrado. Utilize seu acesso existente para aceitar o convite.',
      );
    }

    const createdUser = await this.createUserUseCase.executeOrThrow({
      email: invitationEmail,
      password: input.password,
      name: input.name,
      cpf: cleanCpf,
      phone: input.phone,
      role: RolesEnum.PROFESSIONAL,
      tenantId: input.tenantId,
    });

    const userWithInvitationMetadata = await this.userRepository.update(createdUser.id, {
      metadata: {
        ...(createdUser.metadata ?? {}),
        clinicInvitation: {
          invitationId: invitation.id,
          clinicId: invitation.clinicId,
          acceptedAt: new Date().toISOString(),
        },
      },
    });

    const acceptedInvitation = await this.acceptInvitationUseCase.executeOrThrow({
      invitationId: invitation.id,
      tenantId: input.tenantId,
      acceptedBy: userWithInvitationMetadata.id,
      token: input.token,
    });

    await this.auditService.register({
      event: 'clinic.invitation.onboarding_completed',
      clinicId: invitation.clinicId,
      tenantId: invitation.tenantId,
      performedBy: userWithInvitationMetadata.id,
      detail: {
        invitationId: invitation.id,
        userId: userWithInvitationMetadata.id,
        email: invitationEmail,
        acceptedAt: acceptedInvitation.acceptedAt?.toISOString() ?? new Date().toISOString(),
      },
    });

    return {
      invitation: acceptedInvitation,
      user: userWithInvitationMetadata,
    };
  }
}

export const CompleteClinicInvitationOnboardingUseCaseToken =
  ICompleteClinicInvitationOnboardingUseCaseToken;
