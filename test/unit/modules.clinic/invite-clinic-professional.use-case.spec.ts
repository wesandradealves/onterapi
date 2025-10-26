import { BadRequestException } from '@nestjs/common';

import { InviteClinicProfessionalUseCase } from '../../../src/modules/clinic/use-cases/invite-clinic-professional.use-case';
import { ClinicInvitationTokenService } from '../../../src/modules/clinic/services/clinic-invitation-token.service';
import { ClinicAuditService } from '../../../src/infrastructure/clinic/services/clinic-audit.service';
import { IClinicRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic.repository.interface';
import { IClinicInvitationRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-invitation.repository.interface';
import { IClinicMemberRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-member.repository.interface';
import { IClinicServiceTypeRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-service-type.repository.interface';
import {
  ClinicInvitation,
  ClinicServiceTypeDefinition,
} from '../../../src/domain/clinic/types/clinic.types';
import { ClinicInvitationEconomicSummaryValidator } from '../../../src/modules/clinic/services/clinic-invitation-economic-summary.validator';

type Mocked<T> = jest.Mocked<T>;

const makeServiceType = (
  overrides: Partial<ClinicServiceTypeDefinition> = {},
): ClinicServiceTypeDefinition => ({
  id: 'svc-1',
  clinicId: 'clinic-1',
  name: 'Consulta Inicial',
  slug: 'consulta-inicial',
  color: '#1976d2',
  durationMinutes: 60,
  price: 20000,
  currency: 'BRL',
  isActive: true,
  requiresAnamnesis: false,
  enableOnlineScheduling: true,
  minAdvanceMinutes: 30,
  maxAdvanceMinutes: 4320,
  cancellationPolicy: {
    type: 'percentage',
    windowMinutes: 1440,
    percentage: 50,
    message: 'Cancelamento em 24h cobra 50%',
  },
  eligibility: {
    allowNewPatients: true,
    allowExistingPatients: true,
    minimumAge: null,
    maximumAge: null,
    allowedTags: [],
  },
  instructions: null,
  requiredDocuments: [],
  customFields: [],
  createdAt: new Date('2025-10-01T10:00:00Z'),
  updatedAt: new Date('2025-10-01T10:00:00Z'),
  ...overrides,
});

describe('InviteClinicProfessionalUseCase', () => {
  let clinicRepository: Mocked<IClinicRepository>;
  let invitationRepository: Mocked<IClinicInvitationRepository>;
  let memberRepository: Mocked<IClinicMemberRepository>;
  let serviceTypeRepository: Mocked<IClinicServiceTypeRepository>;
  let auditService: Mocked<ClinicAuditService>;
  let tokenService: Mocked<ClinicInvitationTokenService>;
  let economicSummaryValidator: ClinicInvitationEconomicSummaryValidator;
  let useCase: InviteClinicProfessionalUseCase;

  const baseInput = {
    clinicId: 'clinic-1',
    tenantId: 'tenant-1',
    issuedBy: 'user-issuer',
    professionalId: 'professional-1',
    email: undefined,
    channel: 'email' as const,
    channelScope: 'direct' as const,
    economicSummary: {
      items: [
        {
          serviceTypeId: 'svc-1',
          price: 20000,
          currency: 'BRL',
          payoutModel: 'percentage' as const,
          payoutValue: 50,
        },
      ],
      orderOfRemainders: ['taxes', 'gateway', 'clinic', 'professional', 'platform'],
      roundingStrategy: 'half_even' as const,
    },
    expiresAt: new Date('2025-10-31T23:59:59Z'),
  };

  const makeInvitation = (overrides: Partial<ClinicInvitation> = {}): ClinicInvitation => ({
    id: 'inv-1',
    clinicId: baseInput.clinicId,
    tenantId: baseInput.tenantId,
    issuedBy: baseInput.issuedBy,
    status: 'pending',
    tokenHash: 'hash-original',
    channel: baseInput.channel,
    channelScope: baseInput.channelScope,
    expiresAt: baseInput.expiresAt,
    economicSummary: baseInput.economicSummary,
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
      findByUser: jest.fn(),
    } as unknown as Mocked<IClinicMemberRepository>;

    serviceTypeRepository = {
      list: jest.fn(),
    } as unknown as Mocked<IClinicServiceTypeRepository>;
    economicSummaryValidator = new ClinicInvitationEconomicSummaryValidator(serviceTypeRepository);

    auditService = {
      register: jest.fn().mockResolvedValue(undefined),
    } as unknown as Mocked<ClinicAuditService>;

    tokenService = {
      hash: jest.fn((value: string) => `hash:${value}`),
      generateToken: jest.fn(() => ({ token: 'token-abc', hash: 'hash-updated' })),
    } as unknown as Mocked<ClinicInvitationTokenService>;

    useCase = new InviteClinicProfessionalUseCase(
      clinicRepository,
      invitationRepository,
      memberRepository,
      economicSummaryValidator,
      auditService,
      tokenService,
    );
  });

  it('emite convite quando dados economicos sao validos', async () => {
    clinicRepository.findByTenant.mockResolvedValue({ id: 'clinic-1' } as any);
    memberRepository.findByUser.mockResolvedValue(null);
    invitationRepository.hasActiveInvitation.mockResolvedValue(false);
    serviceTypeRepository.list.mockResolvedValue([makeServiceType()]);

    invitationRepository.create.mockImplementation(async () =>
      makeInvitation({
        tokenHash: 'hash-placeholder',
      }),
    );
    invitationRepository.updateToken.mockImplementation(async () =>
      makeInvitation({
        tokenHash: 'hash-updated',
      }),
    );

    const result = await useCase.executeOrThrow(baseInput);

    expect(invitationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        channelScope: baseInput.channelScope,
      }),
    );
    expect(invitationRepository.updateToken).toHaveBeenCalledWith(
      expect.objectContaining({
        channelScope: baseInput.channelScope,
      }),
    );

    expect(result.metadata?.issuedToken).toBe('token-abc');
    expect(tokenService.generateToken).toHaveBeenCalledWith(
      expect.objectContaining({
        invitationId: 'inv-1',
        clinicId: baseInput.clinicId,
        professionalId: baseInput.professionalId,
        targetEmail: baseInput.email,
      }),
    );
    expect(auditService.register).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'clinic.invitation.issued',
        clinicId: baseInput.clinicId,
        performedBy: baseInput.issuedBy,
      }),
    );
  });

  it('rejeita convites sem itens economicos', async () => {
    clinicRepository.findByTenant.mockResolvedValue({ id: 'clinic-1' } as any);

    await expect(
      useCase.executeOrThrow({
        ...baseInput,
        economicSummary: { ...baseInput.economicSummary, items: [] },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejeita convites com tipos de servico inativos', async () => {
    clinicRepository.findByTenant.mockResolvedValue({ id: 'clinic-1' } as any);
    invitationRepository.hasActiveInvitation.mockResolvedValue(false);
    memberRepository.findByUser.mockResolvedValue(null);
    serviceTypeRepository.list.mockResolvedValue([]);

    await expect(useCase.executeOrThrow(baseInput)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejeita convites com preco divergente', async () => {
    clinicRepository.findByTenant.mockResolvedValue({ id: 'clinic-1' } as any);
    invitationRepository.hasActiveInvitation.mockResolvedValue(false);
    memberRepository.findByUser.mockResolvedValue(null);
    serviceTypeRepository.list.mockResolvedValue([makeServiceType({ price: 18000 })]);

    await expect(useCase.executeOrThrow(baseInput)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejeita convites com percentual de repasse invalido', async () => {
    clinicRepository.findByTenant.mockResolvedValue({ id: 'clinic-1' } as any);
    invitationRepository.hasActiveInvitation.mockResolvedValue(false);
    memberRepository.findByUser.mockResolvedValue(null);
    serviceTypeRepository.list.mockResolvedValue([makeServiceType()]);

    await expect(
      useCase.executeOrThrow({
        ...baseInput,
        economicSummary: {
          ...baseInput.economicSummary,
          items: [
            {
              ...baseInput.economicSummary.items[0],
              payoutValue: 150,
            },
          ],
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejeita convites com valor fixo negativo', async () => {
    clinicRepository.findByTenant.mockResolvedValue({ id: 'clinic-1' } as any);
    invitationRepository.hasActiveInvitation.mockResolvedValue(false);
    memberRepository.findByUser.mockResolvedValue(null);
    serviceTypeRepository.list.mockResolvedValue([makeServiceType()]);

    await expect(
      useCase.executeOrThrow({
        ...baseInput,
        economicSummary: {
          ...baseInput.economicSummary,
          items: [
            {
              ...baseInput.economicSummary.items[0],
              payoutModel: 'fixed',
              payoutValue: -500,
            },
          ],
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejeita convites com tipos de servico duplicados no resumo', async () => {
    clinicRepository.findByTenant.mockResolvedValue({ id: 'clinic-1' } as any);
    invitationRepository.hasActiveInvitation.mockResolvedValue(false);
    memberRepository.findByUser.mockResolvedValue(null);
    serviceTypeRepository.list.mockResolvedValue([makeServiceType()]);

    await expect(
      useCase.executeOrThrow({
        ...baseInput,
        economicSummary: {
          ...baseInput.economicSummary,
          items: [baseInput.economicSummary.items[0], baseInput.economicSummary.items[0]],
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejeita convites com ordem de sobras invalida', async () => {
    clinicRepository.findByTenant.mockResolvedValue({ id: 'clinic-1' } as any);
    invitationRepository.hasActiveInvitation.mockResolvedValue(false);
    memberRepository.findByUser.mockResolvedValue(null);
    serviceTypeRepository.list.mockResolvedValue([makeServiceType()]);

    await expect(
      useCase.executeOrThrow({
        ...baseInput,
        economicSummary: {
          ...baseInput.economicSummary,
          orderOfRemainders: ['gateway', 'taxes', 'clinic', 'professional', 'platform'],
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
