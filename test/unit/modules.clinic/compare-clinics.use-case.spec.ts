import { CompareClinicsUseCase } from '../../../src/modules/clinic/use-cases/compare-clinics.use-case';
import { IClinicMetricsRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-metrics.repository.interface';
import { ClinicComparisonEntry } from '../../../src/domain/clinic/types/clinic.types';

describe('CompareClinicsUseCase', () => {
  let metricsRepository: jest.Mocked<IClinicMetricsRepository>;
  let useCase: CompareClinicsUseCase;

  beforeEach(() => {
    metricsRepository = {
      getComparison: jest.fn(),
    } as unknown as jest.Mocked<IClinicMetricsRepository>;

    useCase = new CompareClinicsUseCase(metricsRepository);
  });

  it('deve buscar comparativo com periodo normalizado e clinicas deduplicadas', async () => {
    const entries: ClinicComparisonEntry[] = [
      {
        clinicId: 'clinic-1',
        name: 'Clinic 1',
        revenue: 1000,
        revenueVariationPercentage: 10,
        appointments: 50,
        appointmentsVariationPercentage: 5,
        activePatients: 30,
        activePatientsVariationPercentage: 3,
        occupancyRate: 0.7,
        occupancyVariationPercentage: 2,
        satisfactionScore: 4.5,
        satisfactionVariationPercentage: 1,
        rankingPosition: 1,
        trendDirection: 'upward',
        trendPercentage: 10,
        benchmarkValue: 950,
        benchmarkGapPercentage: 5.2631578947368425,
        benchmarkPercentile: 100,
      },
    ];

    metricsRepository.getComparison.mockResolvedValue(entries);

    const start = new Date('2025-06-01T00:00:00.000Z');
    const end = new Date('2025-06-30T23:59:59.000Z');

    const result = await useCase.executeOrThrow({
      tenantId: 'tenant-id',
      clinicIds: ['clinic-1', 'clinic-1', 'clinic-2'],
      metric: 'revenue',
      period: { start, end },
    });

    expect(metricsRepository.getComparison).toHaveBeenCalledWith({
      tenantId: 'tenant-id',
      clinicIds: ['clinic-1', 'clinic-2'],
      metric: 'revenue',
      limit: 50,
      period: { start, end },
    });
    expect(result).toEqual(entries);
  });

  it('deve inverter periodo quando a data final for anterior a inicial', async () => {
    metricsRepository.getComparison.mockResolvedValue([]);

    const start = new Date('2025-07-10T00:00:00.000Z');
    const end = new Date('2025-07-01T00:00:00.000Z');

    await useCase.executeOrThrow({
      tenantId: 'tenant-id',
      clinicIds: undefined,
      metric: 'patients',
      period: { start, end },
    });

    expect(metricsRepository.getComparison).toHaveBeenCalledWith({
      tenantId: 'tenant-id',
      clinicIds: undefined,
      metric: 'patients',
      limit: 50,
      period: {
        start: new Date('2025-07-01T00:00:00.000Z'),
        end: new Date('2025-07-10T00:00:00.000Z'),
      },
    });
  });

  it('aplica limite informado', async () => {
    metricsRepository.getComparison.mockResolvedValue([]);

    const start = new Date('2025-08-01T00:00:00.000Z');
    const end = new Date('2025-08-31T23:59:59.000Z');

    await useCase.executeOrThrow({
      tenantId: 'tenant-id',
      clinicIds: [],
      metric: 'occupancy',
      period: { start, end },
      limit: 5,
    });

    expect(metricsRepository.getComparison).toHaveBeenCalledWith({
      tenantId: 'tenant-id',
      clinicIds: undefined,
      metric: 'occupancy',
      period: { start, end },
      limit: 5,
    });
  });
});
