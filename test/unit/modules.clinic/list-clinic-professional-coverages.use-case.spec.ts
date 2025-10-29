import { BadRequestException } from '@nestjs/common';

import { ListClinicProfessionalCoveragesUseCase } from '../../../src/modules/clinic/use-cases/list-clinic-professional-coverages.use-case';
import { IClinicProfessionalCoverageRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-professional-coverage.repository.interface';
import { ClinicProfessionalCoverage } from '../../../src/domain/clinic/types/clinic.types';

type Mocked<T> = jest.Mocked<T>;

describe('ListClinicProfessionalCoveragesUseCase', () => {
  let coverageRepository: Mocked<IClinicProfessionalCoverageRepository>;
  let useCase: ListClinicProfessionalCoveragesUseCase;

  const coverage: ClinicProfessionalCoverage = {
    id: 'coverage-1',
    tenantId: 'tenant-1',
    clinicId: 'clinic-1',
    professionalId: 'professional-1',
    coverageProfessionalId: 'professional-2',
    startAt: new Date('2025-02-01T09:00:00Z'),
    endAt: new Date('2025-02-01T18:00:00Z'),
    status: 'scheduled',
    createdAt: new Date('2025-01-20T10:00:00Z'),
    updatedAt: new Date('2025-01-20T10:00:00Z'),
    createdBy: 'manager-1',
    metadata: {},
  };

  beforeEach(() => {
    coverageRepository = {
      list: jest.fn(),
    } as unknown as Mocked<IClinicProfessionalCoverageRepository>;

    useCase = new ListClinicProfessionalCoveragesUseCase(coverageRepository);
  });

  it('lista coberturas aplicando normalizacao de filtros', async () => {
    coverageRepository.list.mockResolvedValue({
      data: [coverage],
      total: 1,
      page: 1,
      limit: 25,
    });

    const from = new Date('2025-02-01T00:00:00Z');
    const to = new Date('2025-02-28T23:59:59Z');

    const result = await useCase.executeOrThrow({
      tenantId: 'tenant-1',
      clinicId: 'clinic-1',
      from,
      to,
      statuses: ['scheduled', 'active'],
      page: 2,
      limit: 50,
    });

    expect(result.total).toBe(1);
    expect(coverageRepository.list).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        clinicId: 'clinic-1',
        from,
        to,
        statuses: ['scheduled', 'active'],
        page: 2,
        limit: 50,
      }),
    );
  });

  it('falha quando intervalo de datas e invalido', async () => {
    await expect(
      useCase.executeOrThrow({
        tenantId: 'tenant-1',
        clinicId: 'clinic-1',
        from: new Date('2025-02-10T00:00:00Z'),
        to: new Date('2025-02-01T00:00:00Z'),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('falha quando status invalido e informado', async () => {
    await expect(
      useCase.executeOrThrow({
        tenantId: 'tenant-1',
        clinicId: 'clinic-1',
        statuses: ['invalid-status' as never],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('normaliza lista de clinicas quando informada', async () => {
    coverageRepository.list.mockResolvedValue({
      data: [coverage],
      total: 1,
      page: 1,
      limit: 25,
    });

    await useCase.executeOrThrow({
      tenantId: 'tenant-1',
      clinicIds: ['clinic-1', 'clinic-2', 'clinic-1'],
    });

    const call = coverageRepository.list.mock.calls.at(0)?.[0];
    expect(call?.clinicIds).toEqual(['clinic-1', 'clinic-2']);
    expect(call?.clinicId).toBeUndefined();
  });
});
