import { BadRequestException, NotFoundException } from '@nestjs/common';

import { CancelClinicProfessionalCoverageUseCase } from '../../../src/modules/clinic/use-cases/cancel-clinic-professional-coverage.use-case';
import { IClinicProfessionalCoverageRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-professional-coverage.repository.interface';
import { ClinicProfessionalCoverage } from '../../../src/domain/clinic/types/clinic.types';
import { ClinicAuditService } from '../../../src/infrastructure/clinic/services/clinic-audit.service';
import { ClinicCoverageSchedulingService } from '../../../src/modules/clinic/services/clinic-coverage-scheduling.service';

type Mocked<T> = jest.Mocked<T>;

describe('CancelClinicProfessionalCoverageUseCase', () => {
  let coverageRepository: Mocked<IClinicProfessionalCoverageRepository>;
  let auditService: Mocked<ClinicAuditService>;
  let coverageSchedulingService: Mocked<ClinicCoverageSchedulingService>;
  let useCase: CancelClinicProfessionalCoverageUseCase;

  const coverageBase: ClinicProfessionalCoverage = {
    id: 'coverage-1',
    tenantId: 'tenant-1',
    clinicId: 'clinic-1',
    professionalId: 'professional-1',
    coverageProfessionalId: 'professional-2',
    startAt: new Date('2025-02-01T09:00:00Z'),
    endAt: new Date('2025-02-01T18:00:00Z'),
    status: 'scheduled',
    createdBy: 'manager-1',
    createdAt: new Date('2025-01-20T10:00:00Z'),
    updatedAt: new Date('2025-01-20T10:00:00Z'),
    metadata: {},
  };

  beforeEach(() => {
    coverageRepository = {
      findById: jest.fn(),
      cancel: jest.fn(),
    } as unknown as Mocked<IClinicProfessionalCoverageRepository>;

    auditService = {
      register: jest.fn(),
    } as unknown as Mocked<ClinicAuditService>;

    coverageSchedulingService = {
      applyCoverage: jest.fn(),
      releaseCoverage: jest.fn(),
    } as unknown as Mocked<ClinicCoverageSchedulingService>;

    useCase = new CancelClinicProfessionalCoverageUseCase(
      coverageRepository,
      auditService,
      coverageSchedulingService,
    );
  });

  it('cancela cobertura ativa com sucesso', async () => {
    const cancelledCoverage: ClinicProfessionalCoverage = {
      ...coverageBase,
      status: 'cancelled',
      cancelledAt: new Date('2025-01-25T12:00:00Z'),
      cancelledBy: 'manager-1',
      updatedAt: new Date('2025-01-25T12:00:00Z'),
    };

    coverageRepository.findById.mockResolvedValue(coverageBase);
    coverageRepository.cancel.mockResolvedValue(cancelledCoverage);

    const result = await useCase.executeOrThrow({
      tenantId: 'tenant-1',
      clinicId: 'clinic-1',
      coverageId: 'coverage-1',
      cancelledBy: 'manager-1',
      cancellationReason: 'Solicitado pelo titular',
    });

    expect(result).toBe(cancelledCoverage);
    expect(coverageRepository.cancel).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        clinicId: 'clinic-1',
        coverageId: 'coverage-1',
        cancelledBy: 'manager-1',
        cancellationReason: 'Solicitado pelo titular',
      }),
    );
    expect(auditService.register).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'clinic.staff.coverage_cancelled',
        clinicId: 'clinic-1',
        tenantId: 'tenant-1',
      }),
    );
    expect(coverageSchedulingService.releaseCoverage).toHaveBeenCalledWith(
      cancelledCoverage,
      expect.objectContaining({
        reference: expect.any(Date),
        triggeredBy: 'manager-1',
        triggerSource: 'manual',
      }),
    );
  });

  it('falha quando cobertura nao existe', async () => {
    coverageRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.executeOrThrow({
        tenantId: 'tenant-1',
        clinicId: 'clinic-1',
        coverageId: 'coverage-missing',
        cancelledBy: 'manager-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('falha quando cobertura ja esta cancelada', async () => {
    coverageRepository.findById.mockResolvedValue({
      ...coverageBase,
      status: 'cancelled',
      cancelledAt: new Date(),
    });

    await expect(
      useCase.executeOrThrow({
        tenantId: 'tenant-1',
        clinicId: 'clinic-1',
        coverageId: 'coverage-1',
        cancelledBy: 'manager-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('falha quando cobertura ja foi concluida', async () => {
    coverageRepository.findById.mockResolvedValue({
      ...coverageBase,
      status: 'completed',
      updatedAt: new Date(),
    });

    await expect(
      useCase.executeOrThrow({
        tenantId: 'tenant-1',
        clinicId: 'clinic-1',
        coverageId: 'coverage-1',
        cancelledBy: 'manager-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
