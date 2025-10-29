import { ClinicInvitation } from '../../../src/domain/clinic/types/clinic.types';
import { CompleteClinicInvitationOnboardingUseCase } from '../../../src/modules/clinic/use-cases/complete-clinic-invitation-onboarding.use-case';
import { RolesEnum } from '../../../src/domain/auth/enums/roles.enum';
import type { IClinicInvitationRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-invitation.repository.interface';
import { ClinicInvitationTokenService } from '../../../src/modules/clinic/services/clinic-invitation-token.service';
import type { IUserRepository } from '../../../src/domain/users/interfaces/repositories/user.repository.interface';
import type { ICreateUserUseCase } from '../../../src/domain/users/interfaces/use-cases/create-user.use-case.interface';
import type { IAcceptClinicInvitationUseCase } from '../../../src/domain/clinic/interfaces/use-cases/accept-clinic-invitation.use-case.interface';
import { ClinicAuditService } from '../../../src/infrastructure/clinic/services/clinic-audit.service';
import { ClinicErrorFactory } from '../../../src/shared/factories/clinic-error.factory';
import { UserEntity } from '../../../src/infrastructure/auth/entities/user.entity';

describe('CompleteClinicInvitationOnboardingUseCase', () => {
  const baseInvitation: ClinicInvitation = {
    id: 'inv-1',
    clinicId: 'clinic-1',
    tenantId: 'tenant-1',
    professionalId: null as unknown as string | undefined,
    targetEmail: 'pro@example.com',
    issuedBy: 'owner-1',
    status: 'pending',
    tokenHash: 'hash-123',
    channel: 'email',
    channelScope: 'direct',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    economicSummary: {
      items: [
        {
          serviceTypeId: 'svc-1',
          price: 15000,
          currency: 'BRL',
          payoutModel: 'percentage',
          payoutValue: 50,
        },
      ],
      orderOfRemainders: ['taxes', 'gateway', 'clinic', 'professional', 'platform'],
      roundingStrategy: 'half_even',
    },
    createdAt: new Date('2025-10-10T10:00:00.000Z'),
    updatedAt: new Date('2025-10-10T10:00:00.000Z'),
    metadata: {},
  };

  let invitationRepository: jest.Mocked<IClinicInvitationRepository>;
  let tokenService: jest.Mocked<ClinicInvitationTokenService>;
  let userRepository: jest.Mocked<IUserRepository>;
  let createUserUseCase: jest.Mocked<ICreateUserUseCase>;
  let acceptInvitationUseCase: jest.Mocked<IAcceptClinicInvitationUseCase>;
  let auditService: jest.Mocked<ClinicAuditService>;
  let useCase: CompleteClinicInvitationOnboardingUseCase;

  beforeEach(() => {
    invitationRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<IClinicInvitationRepository>;

    tokenService = {
      verifyToken: jest.fn(),
    } as unknown as jest.Mocked<ClinicInvitationTokenService>;

    userRepository = {
      findByEmail: jest.fn(),
      findByCpf: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<IUserRepository>;

    createUserUseCase = {
      executeOrThrow: jest.fn(),
    } as unknown as jest.Mocked<ICreateUserUseCase>;

    acceptInvitationUseCase = {
      executeOrThrow: jest.fn(),
    } as unknown as jest.Mocked<IAcceptClinicInvitationUseCase>;

    auditService = {
      register: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ClinicAuditService>;

    useCase = new CompleteClinicInvitationOnboardingUseCase(
      invitationRepository,
      tokenService,
      userRepository,
      createUserUseCase,
      acceptInvitationUseCase,
      auditService,
    );
  });

  it('should create user and accept invitation for email-based onboarding', async () => {
    invitationRepository.findById.mockResolvedValue(baseInvitation);
    tokenService.verifyToken.mockReturnValue({
      invitationId: baseInvitation.id,
      clinicId: baseInvitation.clinicId,
      tenantId: baseInvitation.tenantId,
      expiresAt: new Date(baseInvitation.expiresAt),
      issuedAt: new Date('2025-10-10T09:00:00.000Z'),
      nonce: 'nonce',
      hash: baseInvitation.tokenHash,
      professionalId: undefined,
      targetEmail: baseInvitation.targetEmail,
    });
    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.findByCpf.mockResolvedValue(null);

    const createdUser = {
      id: 'user-1',
      email: baseInvitation.targetEmail,
      name: 'Profissional Teste',
      slug: 'profissional-teste',
      metadata: {},
    } as UserEntity;

    createUserUseCase.executeOrThrow.mockResolvedValue(createdUser);

    const updatedUser = {
      ...createdUser,
      metadata: {
        clinicInvitation: {
          invitationId: baseInvitation.id,
          clinicId: baseInvitation.clinicId,
          acceptedAt: expect.any(String),
        },
      },
    } as UserEntity;

    userRepository.update.mockResolvedValue(updatedUser);

    const acceptedInvitation: ClinicInvitation = {
      ...baseInvitation,
      status: 'accepted',
      acceptedAt: new Date('2025-10-10T11:00:00.000Z'),
      acceptedBy: updatedUser.id,
    };

    acceptInvitationUseCase.executeOrThrow.mockResolvedValue(acceptedInvitation);

    const result = await useCase.executeOrThrow({
      invitationId: baseInvitation.id,
      tenantId: baseInvitation.tenantId,
      token: 'token-123',
      name: 'Profissional Teste',
      cpf: '123.456.789-09',
      phone: '+55 11 91234-5678',
      password: 'Str0ngPass!',
    });

    expect(createUserUseCase.executeOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        email: baseInvitation.targetEmail,
        cpf: '12345678909',
        role: RolesEnum.PROFESSIONAL,
      }),
    );
    expect(userRepository.update).toHaveBeenCalledWith(
      createdUser.id,
      expect.objectContaining({
        metadata: expect.objectContaining({
          clinicInvitation: expect.objectContaining({
            invitationId: baseInvitation.id,
          }),
        }),
      }),
    );
    expect(acceptInvitationUseCase.executeOrThrow).toHaveBeenCalledWith({
      invitationId: baseInvitation.id,
      tenantId: baseInvitation.tenantId,
      acceptedBy: updatedUser.id,
      token: 'token-123',
    });
    expect(auditService.register).toHaveBeenCalledWith({
      event: 'clinic.invitation.onboarding_completed',
      clinicId: baseInvitation.clinicId,
      tenantId: baseInvitation.tenantId,
      performedBy: updatedUser.id,
      detail: {
        invitationId: baseInvitation.id,
        userId: updatedUser.id,
        email: baseInvitation.targetEmail,
        acceptedAt: expect.any(String),
      },
    });

    expect(result.user.id).toBe(updatedUser.id);
    expect(result.invitation.status).toBe('accepted');
  });

  it('should block onboarding when email already exists', async () => {
    invitationRepository.findById.mockResolvedValue(baseInvitation);
    tokenService.verifyToken.mockReturnValue({
      invitationId: baseInvitation.id,
      clinicId: baseInvitation.clinicId,
      tenantId: baseInvitation.tenantId,
      expiresAt: new Date(baseInvitation.expiresAt),
      issuedAt: new Date(),
      nonce: 'nonce',
      hash: baseInvitation.tokenHash,
      professionalId: undefined,
      targetEmail: baseInvitation.targetEmail,
    });
    userRepository.findByEmail.mockResolvedValue({ id: 'existing-user' } as UserEntity);

    await expect(
      useCase.executeOrThrow({
        invitationId: baseInvitation.id,
        tenantId: baseInvitation.tenantId,
        token: 'token-123',
        name: 'Profissional Teste',
        cpf: '987.654.321-00',
        phone: undefined,
        password: 'AnotherPass1!',
      }),
    ).rejects.toThrow(
      ClinicErrorFactory.invitationOnboardingUserExists(
        'Email ja cadastrado. Utilize seu acesso existente para aceitar o convite.',
      ).constructor,
    );

    expect(createUserUseCase.executeOrThrow).not.toHaveBeenCalled();
    expect(acceptInvitationUseCase.executeOrThrow).not.toHaveBeenCalled();
  });
});
