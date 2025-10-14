import { ConfigService } from '@nestjs/config';

import { AcceptClinicInvitationUseCase } from '../../../src/modules/clinic/use-cases/accept-clinic-invitation.use-case';
import type { IClinicRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic.repository.interface';
import type { IClinicInvitationRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-invitation.repository.interface';
import type { IClinicMemberRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-member.repository.interface';
import type { IClinicConfigurationRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-configuration.repository.interface';
import type { IClinicAppointmentRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-appointment.repository.interface';
import { ClinicInvitationTokenService } from '../../../src/modules/clinic/services/clinic-invitation-token.service';
import { ClinicAuditService } from '../../../src/infrastructure/clinic/services/clinic-audit.service';
import { ClinicInvitation } from '../../../src/domain/clinic/types/clinic.types';
import { RolesEnum } from '../../../src/domain/auth/enums/roles.enum';

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
  let auditService: ClinicAuditService;
  let auditRegisterSpy: jest.SpyInstance;
  let tokenService: ClinicInvitationTokenService;
  let useCase: AcceptClinicInvitationUseCase;

  beforeEach(() => {
    clinicRepository = {
      findByTenant: jest.fn().mockResolvedValue({
        id: baseInvitation.clinicId,
        tenantId: baseInvitation.tenantId,
      }),
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
    });

    useCase = new AcceptClinicInvitationUseCase(
      invitationRepository,
      clinicRepository,
      memberRepository,
      configurationRepository,
      appointmentRepository,
      auditService,
      tokenService,
    );
  });

  it('should include economic snapshot in audit detail when accepting', async () => {
    const result = await useCase.executeOrThrow({
      invitationId: baseInvitation.id,
      tenantId: baseInvitation.tenantId,
      acceptedBy: 'professional-1',
      token: 'signed-token',
    });

    expect(result.acceptedEconomicSnapshot).toBeDefined();
    expect(invitationRepository.markAccepted).toHaveBeenCalledWith({
      invitationId: baseInvitation.id,
      tenantId: baseInvitation.tenantId,
      acceptedBy: 'professional-1',
      token: 'signed-token',
    });

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
        }),
      }),
    );

    const auditPayload = auditRegisterSpy.mock.calls[0][0];
    expect(auditPayload.detail?.economicSnapshot).toEqual(baseInvitation.economicSummary);
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
