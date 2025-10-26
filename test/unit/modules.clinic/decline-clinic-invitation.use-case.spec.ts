import { DeclineClinicInvitationUseCase } from '../../../src/modules/clinic/use-cases/decline-clinic-invitation.use-case';
import { ClinicAuditService } from '../../../src/infrastructure/clinic/services/clinic-audit.service';
import { IClinicInvitationRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-invitation.repository.interface';
import { ClinicInvitation } from '../../../src/domain/clinic/types/clinic.types';

describe('DeclineClinicInvitationUseCase', () => {
  let invitationRepository: jest.Mocked<IClinicInvitationRepository>;
  let auditService: jest.Mocked<ClinicAuditService>;
  let useCase: DeclineClinicInvitationUseCase;

  const baseInvitation: ClinicInvitation = {
    id: 'inv-1',
    clinicId: 'clinic-1',
    tenantId: 'tenant-1',
    professionalId: 'professional-1',
    issuedBy: 'manager-1',
    status: 'pending',
    tokenHash: 'hash',
    channel: 'email',
    channelScope: 'direct',
    expiresAt: new Date('2025-12-01T00:00:00Z'),
    economicSummary: {
      items: [
        {
          serviceTypeId: 'svc-1',
          price: 200,
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

  beforeEach(() => {
    invitationRepository = {
      findById: jest.fn().mockResolvedValue(baseInvitation),
      markDeclined: jest.fn().mockImplementation(async () => ({
        ...baseInvitation,
        status: 'declined',
        declinedAt: new Date('2025-10-15T10:00:00Z'),
        declinedBy: 'professional-1',
      })),
    } as unknown as jest.Mocked<IClinicInvitationRepository>;

    auditService = {
      register: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ClinicAuditService>;

    useCase = new DeclineClinicInvitationUseCase(invitationRepository, auditService);
  });

  it('declina convite pendente e registra auditoria', async () => {
    const result = await useCase.executeOrThrow({
      invitationId: baseInvitation.id,
      tenantId: baseInvitation.tenantId,
      declinedBy: 'professional-1',
      reason: 'Sem agenda',
    });

    expect(invitationRepository.markDeclined).toHaveBeenCalledWith({
      invitationId: baseInvitation.id,
      tenantId: baseInvitation.tenantId,
      declinedBy: 'professional-1',
    });
    expect(auditService.register).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'clinic.invitation.declined',
        clinicId: baseInvitation.clinicId,
        tenantId: baseInvitation.tenantId,
        detail: expect.objectContaining({
          invitationId: baseInvitation.id,
          professionalId: 'professional-1',
          reason: 'Sem agenda',
        }),
      }),
    );
    expect(result.status).toBe('declined');
  });

  it('lan�a erro se convite nao encontrado', async () => {
    invitationRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.executeOrThrow({
        invitationId: 'nope',
        tenantId: baseInvitation.tenantId,
        declinedBy: 'professional-1',
      }),
    ).rejects.toThrow('Convite nao encontrado');
  });

  it('lan�a erro se convite nao estiver pendente', async () => {
    invitationRepository.findById.mockResolvedValue({
      ...baseInvitation,
      status: 'accepted',
    });

    await expect(
      useCase.executeOrThrow({
        invitationId: baseInvitation.id,
        tenantId: baseInvitation.tenantId,
        declinedBy: 'professional-1',
      }),
    ).rejects.toThrow('Convite ja processado');
  });

  it('bloqueia recusa quando profissional difere do convite', async () => {
    await expect(
      useCase.executeOrThrow({
        invitationId: baseInvitation.id,
        tenantId: baseInvitation.tenantId,
        declinedBy: 'another-user',
      }),
    ).rejects.toThrow('Convite nao pertence ao profissional informado');
    expect(invitationRepository.markDeclined).not.toHaveBeenCalled();
  });
});
