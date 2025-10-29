import { ReissueClinicInvitationUseCase } from '../../../src/modules/clinic/use-cases/reissue-clinic-invitation.use-case';
import { ClinicInvitationTokenService } from '../../../src/modules/clinic/services/clinic-invitation-token.service';
import { ClinicInvitationEconomicSummaryValidator } from '../../../src/modules/clinic/services/clinic-invitation-economic-summary.validator';
import { ClinicAuditService } from '../../../src/infrastructure/clinic/services/clinic-audit.service';
import { IClinicInvitationRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-invitation.repository.interface';
import { ClinicInvitation } from '../../../src/domain/clinic/types/clinic.types';

describe('ReissueClinicInvitationUseCase', () => {
  const baseInvitation: ClinicInvitation = {
    id: 'invitation-123',
    clinicId: 'clinic-1',
    tenantId: 'tenant-1',
    issuedBy: 'owner-1',
    status: 'pending',
    tokenHash: 'hash-old',
    channel: 'email',
    channelScope: 'direct',
    expiresAt: new Date('2025-11-01T10:00:00Z'),
    economicSummary: {
      items: [
        {
          serviceTypeId: 'svc-1',
          price: 20000,
          currency: 'BRL',
          payoutModel: 'percentage',
          payoutValue: 50,
        },
      ],
      orderOfRemainders: ['taxes', 'gateway', 'clinic', 'professional', 'platform'],
      roundingStrategy: 'half_even',
    },
    createdAt: new Date('2025-10-01T10:00:00Z'),
    updatedAt: new Date('2025-10-01T10:00:00Z'),
    metadata: {},
  };

  let invitationRepository: jest.Mocked<IClinicInvitationRepository>;
  let auditService: jest.Mocked<ClinicAuditService>;
  let tokenService: jest.Mocked<ClinicInvitationTokenService>;
  let economicSummaryValidator: jest.Mocked<ClinicInvitationEconomicSummaryValidator>;
  let useCase: ReissueClinicInvitationUseCase;

  beforeEach(() => {
    invitationRepository = {
      findById: jest.fn().mockResolvedValue(baseInvitation),
      updateToken: jest.fn().mockImplementation(async () => ({
        ...baseInvitation,
        tokenHash: 'hash-new',
        expiresAt: new Date('2025-12-01T10:00:00Z'),
        channel: 'whatsapp',
        channelScope: 'both',
      })),
    } as unknown as jest.Mocked<IClinicInvitationRepository>;

    auditService = {
      register: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ClinicAuditService>;

    tokenService = {
      assertSecretConfigured: jest.fn(),
      generateToken: jest.fn().mockReturnValue({
        token: 'new-token',
        hash: 'hash-new',
      }),
    } as unknown as jest.Mocked<ClinicInvitationTokenService>;

    economicSummaryValidator = {
      validate: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ClinicInvitationEconomicSummaryValidator>;

    useCase = new ReissueClinicInvitationUseCase(
      invitationRepository,
      auditService,
      tokenService,
      economicSummaryValidator,
    );
  });

  it('reissues an invitation with a new token and expiration', async () => {
    const expiresAt = new Date('2025-12-01T10:00:00Z');
    const result = await useCase.executeOrThrow({
      invitationId: baseInvitation.id,
      tenantId: baseInvitation.tenantId,
      reissuedBy: 'manager-2',
      expiresAt,
      channel: 'whatsapp',
      channelScope: 'both',
    });

    expect(economicSummaryValidator.validate).toHaveBeenCalledWith(
      baseInvitation.clinicId,
      baseInvitation.tenantId,
      baseInvitation.economicSummary,
    );
    expect(tokenService.generateToken).toHaveBeenCalledWith(
      expect.objectContaining({
        invitationId: baseInvitation.id,
        clinicId: baseInvitation.clinicId,
        tenantId: baseInvitation.tenantId,
        expiresAt,
      }),
    );
    expect(invitationRepository.updateToken).toHaveBeenCalledWith(
      expect.objectContaining({
        invitationId: baseInvitation.id,
        tokenHash: 'hash-new',
        expiresAt,
        channel: 'whatsapp',
        channelScope: 'both',
      }),
    );
    expect(result.metadata?.issuedToken).toBe('new-token');
    expect(auditService.register).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'clinic.invitation.reissued',
        clinicId: baseInvitation.clinicId,
        tenantId: baseInvitation.tenantId,
        performedBy: 'manager-2',
      }),
    );
  });

  it('throws when invitation has status not eligible for reissue', async () => {
    invitationRepository.findById.mockResolvedValue({
      ...baseInvitation,
      status: 'accepted',
    });

    await expect(
      useCase.executeOrThrow({
        invitationId: baseInvitation.id,
        tenantId: baseInvitation.tenantId,
        reissuedBy: 'manager-2',
        expiresAt: new Date('2025-12-01T10:00:00Z'),
      }),
    ).rejects.toThrow('nao pode ser reenviado');

    expect(tokenService.generateToken).not.toHaveBeenCalled();
  });

  it('propagates validation errors from the economic summary validator', async () => {
    economicSummaryValidator.validate.mockRejectedValue(new Error('resumo economico invalido'));

    await expect(
      useCase.executeOrThrow({
        invitationId: baseInvitation.id,
        tenantId: baseInvitation.tenantId,
        reissuedBy: 'manager-2',
        expiresAt: new Date('2025-12-01T10:00:00Z'),
      }),
    ).rejects.toThrow('resumo economico invalido');

    expect(invitationRepository.updateToken).not.toHaveBeenCalled();
    expect(auditService.register).not.toHaveBeenCalled();
  });
});
