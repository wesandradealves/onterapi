import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { CreateClinicInvitationAddendumUseCase } from '../../../src/modules/clinic/use-cases/create-clinic-invitation-addendum.use-case';
import { IClinicRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic.repository.interface';
import { IClinicInvitationRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-invitation.repository.interface';
import { IClinicMemberRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-member.repository.interface';
import { ClinicInvitationTokenService } from '../../../src/modules/clinic/services/clinic-invitation-token.service';
import { ClinicInvitationEconomicSummaryValidator } from '../../../src/modules/clinic/services/clinic-invitation-economic-summary.validator';
import { ClinicAuditService } from '../../../src/infrastructure/clinic/services/clinic-audit.service';
import {
  ClinicInvitation,
  ClinicInvitationEconomicSummary,
  ClinicMember,
} from '../../../src/domain/clinic/types/clinic.types';
import { RolesEnum } from '../../../src/domain/auth/enums/roles.enum';

type Mocked<T> = jest.Mocked<T>;

describe('CreateClinicInvitationAddendumUseCase', () => {
  let clinicRepository: Mocked<IClinicRepository>;
  let invitationRepository: Mocked<IClinicInvitationRepository>;
  let memberRepository: Mocked<IClinicMemberRepository>;
  let tokenService: Mocked<ClinicInvitationTokenService>;
  let auditService: Mocked<ClinicAuditService>;
  let economicSummaryValidator: Mocked<ClinicInvitationEconomicSummaryValidator>;
  let useCase: CreateClinicInvitationAddendumUseCase;

  const baseSummary: ClinicInvitationEconomicSummary = {
    items: [
      {
        serviceTypeId: 'svc-1',
        price: 25000,
        currency: 'BRL',
        payoutModel: 'percentage',
        payoutValue: 60,
      },
    ],
    orderOfRemainders: ['taxes', 'gateway', 'clinic', 'professional', 'platform'],
    roundingStrategy: 'half_even',
  };

  const baseInput = {
    clinicId: 'clinic-1',
    tenantId: 'tenant-1',
    issuedBy: 'owner-1',
    professionalId: 'professional-1',
    channel: 'email' as const,
    channelScope: 'direct' as const,
    economicSummary: baseSummary,
    expiresAt: new Date('2025-12-31T23:59:59Z'),
    effectiveAt: new Date('2025-12-01T00:00:00Z'),
    metadata: { origin: 'dashboard' as const },
  };

  const makeInvitation = (overrides: Partial<ClinicInvitation> = {}): ClinicInvitation => ({
    id: 'inv-1',
    clinicId: baseInput.clinicId,
    tenantId: baseInput.tenantId,
    issuedBy: baseInput.issuedBy,
    status: 'pending',
    tokenHash: 'hash-placeholder',
    channel: baseInput.channel,
    channelScope: baseInput.channelScope,
    expiresAt: baseInput.expiresAt,
    economicSummary: baseSummary,
    metadata: {},
    createdAt: new Date('2025-10-01T10:00:00Z'),
    updatedAt: new Date('2025-10-01T10:00:00Z'),
    ...overrides,
  });

  beforeEach(() => {
    clinicRepository = {
      findByTenant: jest.fn(),
    } as unknown as Mocked<IClinicRepository>;

    invitationRepository = {
      hasActiveInvitation: jest.fn(),
      create: jest.fn(),
      updateToken: jest.fn(),
    } as unknown as Mocked<IClinicInvitationRepository>;

    memberRepository = {
      findActiveByClinicAndUser: jest.fn(),
    } as unknown as Mocked<IClinicMemberRepository>;

    tokenService = {
      assertSecretConfigured: jest.fn(),
      hash: jest.fn().mockReturnValue('hash-placeholder'),
      generateToken: jest.fn().mockReturnValue({
        token: 'token-generated',
        hash: 'hash-final',
      }),
    } as unknown as Mocked<ClinicInvitationTokenService>;

    auditService = {
      register: jest.fn().mockResolvedValue(undefined),
    } as unknown as Mocked<ClinicAuditService>;

    economicSummaryValidator = {
      validate: jest.fn().mockResolvedValue(undefined),
    } as unknown as Mocked<ClinicInvitationEconomicSummaryValidator>;

    useCase = new CreateClinicInvitationAddendumUseCase(
      clinicRepository,
      invitationRepository,
      memberRepository,
      economicSummaryValidator,
      auditService,
      tokenService,
    );
  });

  it('emite aditivo e retorna metadata marcada como addendum', async () => {
    clinicRepository.findByTenant.mockResolvedValue({ id: baseInput.clinicId } as any);
    memberRepository.findActiveByClinicAndUser.mockResolvedValue({
      id: 'member-1',
      clinicId: baseInput.clinicId,
      tenantId: baseInput.tenantId,
      userId: baseInput.professionalId,
      role: RolesEnum.PROFESSIONAL,
      status: 'active',
    } as ClinicMember);
    invitationRepository.hasActiveInvitation.mockResolvedValue(false);
    const placeholderInvitation = makeInvitation({
      metadata: { previous: true },
    });
    invitationRepository.create.mockResolvedValue(placeholderInvitation);
    invitationRepository.updateToken.mockResolvedValue(
      makeInvitation({
        tokenHash: 'hash-final',
        metadata: { source: 'finance' },
      }),
    );

    const result = await useCase.executeOrThrow(baseInput);

    expect(tokenService.assertSecretConfigured).toHaveBeenCalledTimes(1);
    expect(economicSummaryValidator.validate).toHaveBeenCalledWith(
      baseInput.clinicId,
      baseInput.tenantId,
      baseSummary,
      { allowInactive: true },
    );
    expect(invitationRepository.create).toHaveBeenCalledWith({
      clinicId: baseInput.clinicId,
      tenantId: baseInput.tenantId,
      issuedBy: baseInput.issuedBy,
      professionalId: baseInput.professionalId,
      email: undefined,
      channel: baseInput.channel,
      channelScope: baseInput.channelScope,
      economicSummary: baseSummary,
      expiresAt: baseInput.expiresAt,
      metadata: {
        origin: 'dashboard',
        kind: 'addendum',
        addendum: { effectiveAt: baseInput.effectiveAt!.toISOString() },
      },
      tokenHash: 'hash-placeholder',
    });
    expect(invitationRepository.updateToken).toHaveBeenCalledWith({
      invitationId: placeholderInvitation.id,
      tenantId: baseInput.tenantId,
      tokenHash: 'hash-final',
      expiresAt: baseInput.expiresAt,
      channel: baseInput.channel,
      channelScope: baseInput.channelScope,
    });
    expect(auditService.register).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'clinic.invitation.addendum_issued',
        detail: expect.objectContaining({
          professionalId: baseInput.professionalId,
          expiresAt: baseInput.expiresAt,
          effectiveAt: baseInput.effectiveAt,
        }),
      }),
    );
    expect(result.metadata).toEqual({
      source: 'finance',
      kind: 'addendum',
      addendum: { effectiveAt: baseInput.effectiveAt!.toISOString() },
      issuedToken: 'token-generated',
    });
  });

  it('lança erro quando data de expiração não é futura', async () => {
    clinicRepository.findByTenant.mockResolvedValue({ id: baseInput.clinicId } as any);
    memberRepository.findActiveByClinicAndUser.mockResolvedValue({
      id: 'member-1',
      role: RolesEnum.PROFESSIONAL,
      status: 'active',
    } as ClinicMember);
    invitationRepository.hasActiveInvitation.mockResolvedValue(false);

    await expect(
      useCase.executeOrThrow({
        ...baseInput,
        expiresAt: new Date(Date.now() - 1000),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lança erro quando profissional não está ativo na clínica', async () => {
    clinicRepository.findByTenant.mockResolvedValue({ id: baseInput.clinicId } as any);
    memberRepository.findActiveByClinicAndUser.mockResolvedValue(null);

    await expect(useCase.executeOrThrow(baseInput)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lança erro quando há outro convite pendente', async () => {
    clinicRepository.findByTenant.mockResolvedValue({ id: baseInput.clinicId } as any);
    memberRepository.findActiveByClinicAndUser.mockResolvedValue({
      id: 'member-1',
      role: RolesEnum.PROFESSIONAL,
      status: 'active',
    } as ClinicMember);
    invitationRepository.hasActiveInvitation.mockResolvedValue(true);

    await expect(useCase.executeOrThrow(baseInput)).rejects.toBeInstanceOf(ConflictException);
  });
});
