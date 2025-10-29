import { ConfigService } from '@nestjs/config';

import { ClinicProfessionalCoverageWorkerService } from '../../../src/modules/clinic/services/clinic-professional-coverage-worker.service';
import { ClinicCoverageSchedulingService } from '../../../src/modules/clinic/services/clinic-coverage-scheduling.service';
import { IClinicProfessionalCoverageRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-professional-coverage.repository.interface';
import { ClinicAuditService } from '../../../src/infrastructure/clinic/services/clinic-audit.service';
import { ClinicProfessionalCoverage } from '../../../src/domain/clinic/types/clinic.types';

describe('ClinicProfessionalCoverageWorkerService', () => {
  let configService: jest.Mocked<ConfigService>;
  let coverageRepository: jest.Mocked<IClinicProfessionalCoverageRepository>;
  let auditService: jest.Mocked<ClinicAuditService>;
  let coverageSchedulingService: jest.Mocked<ClinicCoverageSchedulingService>;
  let service: ClinicProfessionalCoverageWorkerService;

  const buildService = (overrides: Record<string, string | boolean | number | undefined>) => {
    configService.get.mockImplementation((key: string) => overrides[key]);
    service = new ClinicProfessionalCoverageWorkerService(
      configService,
      coverageRepository,
      auditService,
      coverageSchedulingService,
    );
    return service;
  };

  const coverageFixture = (
    overrides: Partial<ClinicProfessionalCoverage> = {},
  ): ClinicProfessionalCoverage => ({
    id: 'coverage-1',
    tenantId: 'tenant-1',
    clinicId: 'clinic-1',
    professionalId: 'professional-1',
    coverageProfessionalId: 'professional-2',
    startAt: new Date('2025-02-01T09:00:00Z'),
    endAt: new Date('2025-02-01T18:00:00Z'),
    status: 'scheduled',
    reason: 'Ferias',
    notes: 'Cobertura integral',
    metadata: {},
    createdBy: 'manager-1',
    createdAt: new Date('2025-01-20T10:00:00Z'),
    updatedBy: 'manager-1',
    updatedAt: new Date('2025-01-20T10:00:00Z'),
    cancelledAt: undefined,
    cancelledBy: undefined,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllTimers();
    configService = { get: jest.fn() } as unknown as jest.Mocked<ConfigService>;
    coverageRepository = {
      findDueToComplete: jest.fn().mockResolvedValue([]),
      findScheduledToActivate: jest.fn().mockResolvedValue([]),
      updateStatus: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IClinicProfessionalCoverageRepository>;
    auditService = {
      register: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ClinicAuditService>;
    coverageSchedulingService = {
      applyCoverage: jest.fn().mockResolvedValue(undefined),
      releaseCoverage: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ClinicCoverageSchedulingService>;
  });

  it('nao inicia quando worker esta desabilitado', () => {
    buildService({
      CLINIC_COVERAGE_WORKER_ENABLED: 'false',
      CLINIC_COVERAGE_WORKER_INTERVAL_MS: '60000',
      CLINIC_COVERAGE_WORKER_BATCH_LIMIT: '25',
    }).onModuleInit();

    expect(coverageRepository.findDueToComplete).not.toHaveBeenCalled();
    expect(coverageRepository.findScheduledToActivate).not.toHaveBeenCalled();
    expect(auditService.register).not.toHaveBeenCalled();
    expect(coverageSchedulingService.applyCoverage).not.toHaveBeenCalled();
    expect(coverageSchedulingService.releaseCoverage).not.toHaveBeenCalled();
  });

  it('executa ciclo atualizando concluicoes e ativacoes automaticamente', async () => {
    const completionCoverage = coverageFixture({
      id: 'coverage-complete',
      status: 'active',
      endAt: new Date('2025-02-01T09:30:00Z'),
    });
    const activationCoverage = coverageFixture({
      id: 'coverage-active',
      startAt: new Date('2025-02-01T08:30:00Z'),
      endAt: new Date('2025-02-01T19:00:00Z'),
    });

    coverageRepository.findDueToComplete.mockResolvedValue([completionCoverage]);
    coverageRepository.findScheduledToActivate.mockResolvedValue([activationCoverage]);

    const worker = buildService({
      CLINIC_COVERAGE_WORKER_ENABLED: 'true',
      CLINIC_COVERAGE_WORKER_INTERVAL_MS: '60000',
      CLINIC_COVERAGE_WORKER_BATCH_LIMIT: '50',
    });

    await (worker as unknown as { executeCycle: () => Promise<void> }).executeCycle();

    expect(coverageRepository.findDueToComplete).toHaveBeenCalledTimes(1);
    expect(coverageRepository.findScheduledToActivate).toHaveBeenCalledTimes(1);
    expect(coverageRepository.updateStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        coverageId: 'coverage-complete',
        status: 'completed',
        updatedBy: 'system:coverage-status-worker',
      }),
    );
    expect(coverageRepository.updateStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        coverageId: 'coverage-active',
        status: 'active',
        updatedBy: 'system:coverage-status-worker',
      }),
    );
    expect(auditService.register).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'clinic.staff.coverage_completed',
        performedBy: 'system:coverage-status-worker',
      }),
    );
    expect(auditService.register).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'clinic.staff.coverage_activated',
        performedBy: 'system:coverage-status-worker',
      }),
    );
    expect(auditService.register).toHaveBeenCalledTimes(2);
    expect(coverageSchedulingService.applyCoverage).toHaveBeenCalledWith(
      activationCoverage,
      expect.objectContaining({
        triggerSource: 'automatic',
        triggeredBy: 'system:coverage-status-worker',
      }),
    );
    expect(coverageSchedulingService.releaseCoverage).toHaveBeenCalledWith(
      completionCoverage,
      expect.objectContaining({
        reference: expect.any(Date),
        triggerSource: 'automatic',
        triggeredBy: 'system:coverage-status-worker',
      }),
    );
  });

  it('evita execucao concorrente quando ciclo esta em andamento', async () => {
    coverageRepository.findDueToComplete.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return [coverageFixture()];
    });
    coverageRepository.findScheduledToActivate.mockResolvedValue([]);

    const worker = buildService({
      CLINIC_COVERAGE_WORKER_ENABLED: 'true',
      CLINIC_COVERAGE_WORKER_INTERVAL_MS: '60000',
      CLINIC_COVERAGE_WORKER_BATCH_LIMIT: '10',
    });

    const runCycle = () =>
      (worker as unknown as { executeCycle: () => Promise<void> }).executeCycle();

    await Promise.all([runCycle(), runCycle()]);

    expect(coverageRepository.findDueToComplete).toHaveBeenCalledTimes(1);
    expect(coverageRepository.findScheduledToActivate).toHaveBeenCalledTimes(1);
  });
});
