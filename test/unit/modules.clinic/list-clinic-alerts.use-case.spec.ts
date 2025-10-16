import { NotFoundException } from '@nestjs/common';

import { IClinicMetricsRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-metrics.repository.interface';
import { IClinicRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic.repository.interface';
import { Clinic } from '../../../src/domain/clinic/types/clinic.types';
import { ListClinicAlertsUseCase } from '../../../src/modules/clinic/use-cases/list-clinic-alerts.use-case';

const createClinic = (overrides: Partial<Clinic> = {}): Clinic =>
  ({
    id: 'clinic-a',
    tenantId: 'tenant-1',
    name: 'Clinic A',
    slug: 'clinic-a',
    status: 'active',
    primaryOwnerId: 'owner-1',
    configurationVersions: {},
    holdSettings: {
      ttlMinutes: 30,
      minAdvanceMinutes: 60,
      maxAdvanceMinutes: undefined,
      allowOverbooking: false,
      overbookingThreshold: undefined,
      resourceMatchingStrict: true,
    },
    metadata: {},
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    document: undefined,
    deletedAt: undefined,
    ...overrides,
  }) as Clinic;

describe('ListClinicAlertsUseCase', () => {
  let clinicMetricsRepository: jest.Mocked<IClinicMetricsRepository>;
  let clinicRepository: jest.Mocked<IClinicRepository>;
  let useCase: ListClinicAlertsUseCase;

  beforeEach(() => {
    clinicMetricsRepository = {
      listAlerts: jest.fn(),
    } as unknown as jest.Mocked<IClinicMetricsRepository>;

    clinicRepository = {
      findByIds: jest.fn(),
      list: jest.fn(),
    } as unknown as jest.Mocked<IClinicRepository>;

    useCase = new ListClinicAlertsUseCase(clinicMetricsRepository, clinicRepository);
  });

  it('lista alertas para clinicas especificadas', async () => {
    clinicRepository.findByIds.mockResolvedValue([
      createClinic({ id: 'clinic-a' }),
      createClinic({ id: 'clinic-b', slug: 'clinic-b' }),
    ]);

    clinicMetricsRepository.listAlerts.mockResolvedValue([
      {
        id: 'alert-1',
        tenantId: 'tenant-1',
        clinicId: 'clinic-a',
        type: 'performance',
        channel: 'in_app',
        triggeredBy: 'user-ctx',
        triggeredAt: new Date('2025-03-01T10:00:00Z'),
        resolvedAt: null,
        resolvedBy: null,
        payload: { delta: -10 },
      },
    ]);

    const result = await useCase.executeOrThrow({
      tenantId: 'tenant-1',
      clinicIds: ['clinic-a', 'clinic-b'],
      types: ['performance'],
      activeOnly: true,
      limit: 10,
    });

    expect(clinicRepository.findByIds).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      clinicIds: ['clinic-a', 'clinic-b'],
      includeDeleted: false,
    });
    expect(clinicMetricsRepository.listAlerts).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      clinicIds: ['clinic-a', 'clinic-b'],
      types: ['performance'],
      activeOnly: true,
      limit: 10,
    });
    expect(result).toHaveLength(1);
  });

  it('lanca erro quando clinica nao pertence ao tenant', async () => {
    clinicRepository.findByIds.mockResolvedValue([createClinic({ id: 'clinic-a' })]);

    await expect(
      useCase.executeOrThrow({ tenantId: 'tenant-1', clinicIds: ['clinic-a', 'clinic-b'] }),
    ).rejects.toThrow(NotFoundException);
  });

  it('busca todas as clinicas do tenant quando nao informado', async () => {
    clinicRepository.list.mockResolvedValue({
      data: [createClinic({ id: 'clinic-a' }), createClinic({ id: 'clinic-b', slug: 'clinic-b' })],
      total: 2,
    });
    clinicMetricsRepository.listAlerts.mockResolvedValue([]);

    await useCase.executeOrThrow({ tenantId: 'tenant-1', limit: 5 });

    expect(clinicRepository.list).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      status: ['active', 'pending', 'suspended'],
      limit: 5,
      page: 1,
    });
    expect(clinicMetricsRepository.listAlerts).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      clinicIds: ['clinic-a', 'clinic-b'],
      types: undefined,
      activeOnly: true,
      limit: 5,
    });
  });
});
