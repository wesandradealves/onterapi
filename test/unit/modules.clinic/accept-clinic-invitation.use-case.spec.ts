import { ConfigService } from '@nestjs/config';

import { AcceptClinicInvitationUseCase } from '../../../src/modules/clinic/use-cases/accept-clinic-invitation.use-case';
import type { IClinicRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic.repository.interface';
import type { IClinicInvitationRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-invitation.repository.interface';
import type { IClinicMemberRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-member.repository.interface';
import type { IClinicConfigurationRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-configuration.repository.interface';
import type { IClinicAppointmentRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-appointment.repository.interface';
import type { IClinicProfessionalPolicyRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-professional-policy.repository.interface';
import { ClinicInvitationTokenService } from '../../../src/modules/clinic/services/clinic-invitation-token.service';
import { ClinicAuditService } from '../../../src/infrastructure/clinic/services/clinic-audit.service';
import { ClinicInvitation } from '../../../src/domain/clinic/types/clinic.types';
import { RolesEnum } from '../../../src/domain/auth/enums/roles.enum';
import { ClinicInvitationEconomicSummaryValidator } from '../../../src/modules/clinic/services/clinic-invitation-economic-summary.validator';

describe('AcceptClinicInvitationUseCase', () => {
  const baseInvitation: ClinicInvitation = {
    id: 'invitation-1',
    clinicId: 'clinic-1',
    tenantId: 'tenant-1',
    professionalId: 'professional-1',
    issuedBy: 'manager-1',
    status: 'pending',
    tokenHash: 'token-hash',
    channel: 'email',
    channelScope: 'direct',
    expiresAt: new Date('2099-12-31T23:59:59.000Z'),
    economicSummary: {
      items: [
        {
          serviceTypeId: 'service-1',
          price: 150,
          currency: 'BRL',
          payoutModel: 'percentage',
          payoutValue: 40,
        },
      ],
      orderOfRemainders: ['taxes', 'gateway', 'clinic', 'professional', 'platform'],
      roundingStrategy: 'half_even',
    },
    createdAt: new Date('2025-10-10T10:00:00.000Z'),
    updatedAt: new Date('2025-10-10T10:00:00.000Z'),
    metadata: {},
  };

  let clinicRepository: jest.Mocked<IClinicRepository>;
  let invitationRepository: jest.Mocked<IClinicInvitationRepository>;
  let memberRepository: jest.Mocked<IClinicMemberRepository>;
  let configurationRepository: jest.Mocked<IClinicConfigurationRepository>;
  let appointmentRepository: jest.Mocked<IClinicAppointmentRepository>;
  let professionalPolicyRepository: jest.Mocked<IClinicProfessionalPolicyRepository>;
  let auditService: ClinicAuditService;
  let auditRegisterSpy: jest.SpyInstance;
  let tokenService: ClinicInvitationTokenService;
  let economicSummaryValidator: jest.Mocked<ClinicInvitationEconomicSummaryValidator>;
  let useCase: AcceptClinicInvitationUseCase;

  beforeEach(() => {
    clinicRepository = {
      findByTenant: jest.fn().mockResolvedValue({
        id: baseInvitation.clinicId,
        tenantId: baseInvitation.tenantId,
      }),
      listComplianceDocuments: jest.fn(),
    } as unknown as jest.Mocked<IClinicRepository>;

    invitationRepository = {
      findById: jest.fn().mockResolvedValue(baseInvitation),
      markAccepted: jest.fn().mockImplementation(async () => ({
        ...baseInvitation,
        status: 'accepted',
        acceptedAt: new Date('2025-10-11T10:00:00.000Z'),
        acceptedBy: 'professional-1',
        acceptedEconomicSnapshot: {
          ...baseInvitation.economicSummary,
          items: baseInvitation.economicSummary.items.map((item) => ({ ...item })),
        },
      })),
    } as unknown as jest.Mocked<IClinicInvitationRepository>;

    memberRepository = {
      findByUser: jest.fn().mockResolvedValue(null),
      findActiveByClinicAndUser: jest.fn().mockResolvedValue(null),
      addMember: jest.fn().mockResolvedValue({
        id: 'member-1',
        clinicId: baseInvitation.clinicId,
        userId: 'professional-1',
        tenantId: baseInvitation.tenantId,
        role: RolesEnum.PROFESSIONAL,
        status: 'active',
        scope: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    } as unknown as jest.Mocked<IClinicMemberRepository>;

    configurationRepository = {
      findLatestAppliedVersion: jest.fn().mockResolvedValue({
        payload: {
          quotas: [],
          allowExternalInvitations: true,
          defaultMemberStatus: 'pending_invitation',
          requireFinancialClearance: false,
        },
      } as any),
    } as unknown as jest.Mocked<IClinicConfigurationRepository>;

    appointmentRepository = {
      countByProfessionalAndPaymentStatus: jest.fn().mockResolvedValue(0),
    } as unknown as jest.Mocked<IClinicAppointmentRepository>;

    professionalPolicyRepository = {
      replacePolicy: jest.fn().mockResolvedValue({
        id: 'policy-1',
        clinicId: baseInvitation.clinicId,
        tenantId: baseInvitation.tenantId,
        professionalId: baseInvitation.professionalId ?? 'professional-1',
        channelScope: 'direct',
        economicSummary: baseInvitation.economicSummary,
        effectiveAt: new Date('2025-10-11T10:00:00.000Z'),
        endedAt: undefined,
        sourceInvitationId: baseInvitation.id,
        acceptedBy: 'professional-1',
        createdAt: new Date('2025-10-11T10:00:00.000Z'),
        updatedAt: new Date('2025-10-11T10:00:00.000Z'),
      }),
      findActivePolicy: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<IClinicProfessionalPolicyRepository>;

    auditService = new ClinicAuditService({
      create: jest.fn().mockResolvedValue(undefined),
    } as never);
    auditRegisterSpy = jest.spyOn(auditService, 'register').mockResolvedValue();

    tokenService = new ClinicInvitationTokenService({
      get: jest.fn().mockReturnValue('secret'),
    } as unknown as ConfigService);

    jest.spyOn(tokenService, 'verifyToken').mockReturnValue({
      invitationId: baseInvitation.id,
      clinicId: baseInvitation.clinicId,
      tenantId: baseInvitation.tenantId,
      expiresAt: new Date('2099-12-31T23:59:59.000Z'),
      issuedAt: new Date('2025-10-10T09:00:00.000Z'),
      nonce: 'nonce',
      hash: baseInvitation.tokenHash,
      professionalId: baseInvitation.professionalId,
      targetEmail: undefined,
    });

    economicSummaryValidator = {
      validate: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ClinicInvitationEconomicSummaryValidator>;

    useCase = new AcceptClinicInvitationUseCase(
      invitationRepository,
      clinicRepository,
      memberRepository,
      professionalPolicyRepository,
      configurationRepository,
      appointmentRepository,
      auditService,
      tokenService,
      economicSummaryValidator,
    );
  });

  it('should include economic snapshot in audit detail when accepting', async () => {
    const result = await useCase.executeOrThrow({
      invitationId: baseInvitation.id,
      tenantId: baseInvitation.tenantId,
      acceptedBy: 'professional-1',
      token: 'signed-token',
    });

    expect(economicSummaryValidator.validate).toHaveBeenCalledWith(
      baseInvitation.clinicId,
      baseInvitation.tenantId,
      baseInvitation.economicSummary,
      { allowInactive: true },
    );
    expect(result.acceptedEconomicSnapshot).toBeDefined();
    expect(invitationRepository.markAccepted).toHaveBeenCalledWith({
      invitationId: baseInvitation.id,
      tenantId: baseInvitation.tenantId,
      acceptedBy: 'professional-1',
      token: 'signed-token',
    });
    expect(professionalPolicyRepository.replacePolicy).toHaveBeenCalledWith(
      expect.objectContaining({
        clinicId: baseInvitation.clinicId,
        tenantId: baseInvitation.tenantId,
        professionalId: baseInvitation.professionalId,
        channelScope: 'direct',
        sourceInvitationId: baseInvitation.id,
      }),
    );

    expect(auditRegisterSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'clinic.invitation.accepted',
        clinicId: baseInvitation.clinicId,
        tenantId: baseInvitation.tenantId,
        performedBy: 'professional-1',
        detail: expect.objectContaining({
          invitationId: baseInvitation.id,
          professionalId: 'professional-1',
          economicSnapshot: expect.any(Object),
          policyId: 'policy-1',
          kind: 'standard',
        }),
      }),
    );

    const auditPayload = auditRegisterSpy.mock.calls[0][0];
    expect(auditPayload.detail?.economicSnapshot).toEqual(baseInvitation.economicSummary);
  });

  it('should accept addendum without re-adding member and honor effective date metadata', async () => {
    const addendumInvitation: ClinicInvitation = {
      ...baseInvitation,
      metadata: {
        kind: 'addendum',
        addendum: {
          effectiveAt: '2025-12-01T00:00:00.000Z',
        },
      },
    };

    invitationRepository.findById.mockResolvedValueOnce(addendumInvitation);
    memberRepository.findByUser.mockResolvedValueOnce({
      id: 'member-1',
      clinicId: addendumInvitation.clinicId,
      userId: 'professional-1',
    } as any);
    memberRepository.findActiveByClinicAndUser.mockResolvedValueOnce({
      id: 'member-1',
      clinicId: addendumInvitation.clinicId,
      tenantId: addendumInvitation.tenantId,
      userId: 'professional-1',
      role: RolesEnum.PROFESSIONAL,
      status: 'active',
      scope: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const acceptedAddendum: ClinicInvitation = {
      ...addendumInvitation,
      status: 'accepted',
      acceptedAt: new Date('2025-11-01T10:00:00.000Z'),
      acceptedBy: 'professional-1',
      acceptedEconomicSnapshot: addendumInvitation.economicSummary,
    };

    invitationRepository.markAccepted.mockResolvedValueOnce(acceptedAddendum);

    const effectiveDate = new Date('2025-12-01T00:00:00.000Z');

    professionalPolicyRepository.replacePolicy.mockResolvedValueOnce({
      id: 'policy-2',
      clinicId: addendumInvitation.clinicId,
      tenantId: addendumInvitation.tenantId,
      professionalId: addendumInvitation.professionalId!,
      channelScope: addendumInvitation.channelScope,
      economicSummary: addendumInvitation.economicSummary,
      effectiveAt: effectiveDate,
      endedAt: undefined,
      sourceInvitationId: addendumInvitation.id,
      acceptedBy: 'professional-1',
      createdAt: effectiveDate,
      updatedAt: effectiveDate,
    } as any);

    const result = await useCase.executeOrThrow({
      invitationId: addendumInvitation.id,
      tenantId: addendumInvitation.tenantId,
      acceptedBy: 'professional-1',
      token: 'signed-token',
    });

    expect(memberRepository.addMember).not.toHaveBeenCalled();
    expect(professionalPolicyRepository.replacePolicy).toHaveBeenCalledWith(
      expect.objectContaining({
        effectiveAt: effectiveDate,
      }),
    );
    expect(result.metadata?.kind).toBe('addendum');
    expect(auditRegisterSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          kind: 'addendum',
        }),
      }),
    );
  });

  it('should reject acceptance when token does not match invited professional', async () => {
    (tokenService.verifyToken as jest.Mock).mockReturnValueOnce({
      invitationId: baseInvitation.id,
      clinicId: baseInvitation.clinicId,
      tenantId: baseInvitation.tenantId,
      expiresAt: new Date('2099-12-31T23:59:59.000Z'),
      issuedAt: new Date('2025-10-10T09:00:00.000Z'),
      nonce: 'nonce',
      hash: baseInvitation.tokenHash,
      professionalId: 'another-professional',
      targetEmail: undefined,
    });

    await expect(
      useCase.executeOrThrow({
        invitationId: baseInvitation.id,
        tenantId: baseInvitation.tenantId,
        acceptedBy: 'professional-1',
        token: 'signed-token',
      }),
    ).rejects.toThrow('Token nao corresponde ao profissional convidado');

    expect(professionalPolicyRepository.replacePolicy).not.toHaveBeenCalled();
  });

  it('should block acceptance when financial clearance is required and pendencias exist', async () => {
    configurationRepository.findLatestAppliedVersion.mockResolvedValue({
      payload: {
        requireFinancialClearance: true,
      },
    } as any);

    appointmentRepository.countByProfessionalAndPaymentStatus.mockResolvedValue(2);

    await expect(
      useCase.executeOrThrow({
        invitationId: baseInvitation.id,
        tenantId: baseInvitation.tenantId,
        acceptedBy: 'professional-1',
        token: 'signed-token',
      }),
    ).rejects.toThrow('pendencias financeiras');

    expect(memberRepository.addMember).not.toHaveBeenCalled();
    expect(auditRegisterSpy).not.toHaveBeenCalled();
  });

  it('should allow acceptance when financial clearance is required but no pendencias exist', async () => {
    configurationRepository.findLatestAppliedVersion.mockResolvedValue({
      payload: {
        requireFinancialClearance: true,
      },
    } as any);

    appointmentRepository.countByProfessionalAndPaymentStatus.mockResolvedValue(0);

    await useCase.executeOrThrow({
      invitationId: baseInvitation.id,
      tenantId: baseInvitation.tenantId,
      acceptedBy: 'professional-1',
      token: 'signed-token',
    });

    expect(appointmentRepository.countByProfessionalAndPaymentStatus).toHaveBeenCalledWith({
      clinicId: baseInvitation.clinicId,
      tenantId: baseInvitation.tenantId,
      professionalId: 'professional-1',
      statuses: ['chargeback', 'failed'],
    });
  });
});
