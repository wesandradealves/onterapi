import { ConfigService } from '@nestjs/config';

import { ClinicAuditService } from '../../../src/infrastructure/clinic/services/clinic-audit.service';
import { ClinicInvitationExpirationWorkerService } from '../../../src/modules/clinic/services/clinic-invitation-expiration-worker.service';
import { IClinicInvitationRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-invitation.repository.interface';

describe('ClinicInvitationExpirationWorkerService', () => {
  let auditService: jest.Mocked<ClinicAuditService>;
  let configService: jest.Mocked<ConfigService>;
  let invitationRepository: jest.Mocked<IClinicInvitationRepository>;
  let service: ClinicInvitationExpirationWorkerService;

  const buildService = (overrides: Record<string, string | boolean | number>) => {
    configService.get.mockImplementation((key: string) => overrides[key]);
    service = new ClinicInvitationExpirationWorkerService(
      configService,
      invitationRepository,
      auditService,
    );
    return service;
  };

  beforeEach(() => {
    configService = { get: jest.fn() } as unknown as jest.Mocked<ConfigService>;
    auditService = {
      register: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ClinicAuditService>;
    invitationRepository = {
      expireInvitationsBefore: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<IClinicInvitationRepository>;
  });

  it('nao inicia quando worker esta desabilitado', () => {
    buildService({
      CLINIC_INVITATION_EXPIRATION_WORKER_ENABLED: 'false',
      CLINIC_INVITATION_EXPIRATION_WORKER_INTERVAL_MS: '60000',
    }).onModuleInit();

    expect(invitationRepository.expireInvitationsBefore).not.toHaveBeenCalled();
    expect(auditService.register).not.toHaveBeenCalled();
  });

  it('executa ciclo e expira convites pendentes', async () => {
    const expiredAt = new Date('2025-10-12T10:00:00Z');
    invitationRepository.expireInvitationsBefore.mockResolvedValue([
      { invitationId: 'inv-1', clinicId: 'clinic-1', tenantId: 'tenant-1', expiredAt },
    ]);

    const worker = buildService({
      CLINIC_INVITATION_EXPIRATION_WORKER_ENABLED: 'true',
      CLINIC_INVITATION_EXPIRATION_WORKER_INTERVAL_MS: '60000',
    });

    await (worker as unknown as { executeCycle: () => Promise<void> }).executeCycle();

    expect(invitationRepository.expireInvitationsBefore).toHaveBeenCalledTimes(1);
    const calledWith = invitationRepository.expireInvitationsBefore.mock.calls[0][0];
    expect(calledWith).toBeInstanceOf(Date);
    expect(auditService.register).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        clinicId: 'clinic-1',
        event: 'clinic.invitation.expired',
        performedBy: 'system:invitation-expiration-worker',
        detail: expect.objectContaining({
          invitationId: 'inv-1',
          expiredAt: expiredAt.toISOString(),
          reason: 'ttl_elapsed',
        }),
      }),
    );
    expect(auditService.register).toHaveBeenCalledTimes(1);
  });

  it('evita concorrencia quando ciclo ja esta em andamento', async () => {
    const expiredAt = new Date('2025-10-12T11:00:00Z');
    invitationRepository.expireInvitationsBefore.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return [
        {
          invitationId: 'inv-1',
          clinicId: 'clinic-1',
          tenantId: 'tenant-1',
          expiredAt,
        },
      ];
    });

    const worker = buildService({
      CLINIC_INVITATION_EXPIRATION_WORKER_ENABLED: 'true',
      CLINIC_INVITATION_EXPIRATION_WORKER_INTERVAL_MS: '60000',
    });

    const runCycle = () =>
      (worker as unknown as { executeCycle: () => Promise<void> }).executeCycle();

    await Promise.all([runCycle(), runCycle()]);

    expect(invitationRepository.expireInvitationsBefore).toHaveBeenCalledTimes(1);
    expect(auditService.register).toHaveBeenCalledTimes(1);
  });
});
