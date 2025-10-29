import { GetClinicDashboardUseCase } from '../../../src/modules/clinic/use-cases/get-clinic-dashboard.use-case';
import { IClinicMetricsRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-metrics.repository.interface';
import { ICompareClinicsUseCase } from '../../../src/domain/clinic/interfaces/use-cases/compare-clinics.use-case.interface';
import {
  ClinicAlert,
  ClinicComparisonEntry,
  ClinicDashboardSnapshot,
  ClinicForecastProjection,
} from '../../../src/domain/clinic/types/clinic.types';

type Mocked<T> = jest.Mocked<T>;

const createSnapshot = (
  overrides: Partial<ClinicDashboardSnapshot> = {},
): ClinicDashboardSnapshot => ({
  period: { start: new Date('2025-01-01T00:00:00Z'), end: new Date('2025-01-31T23:59:59Z') },
  totals: {
    clinics: 2,
    professionals: 5,
    activePatients: 120,
    revenue: 45000,
  },
  metrics: [],
  alerts: [],
  ...overrides,
});

const createAlert = (overrides: Partial<ClinicAlert> = {}): ClinicAlert => ({
  id: 'alert-1',
  clinicId: 'clinic-1',
  type: 'revenue_drop',
  channel: 'in_app',
  triggeredAt: new Date('2025-01-15T10:00:00Z'),
  payload: {},
  ...overrides,
});

const createComparisonEntry = (
  overrides: Partial<ClinicComparisonEntry> = {},
): ClinicComparisonEntry => ({
  clinicId: 'clinic-1',
  name: 'Clinica Alpha',
  revenue: 12000,
  revenueVariationPercentage: 10,
  appointments: 80,
  appointmentsVariationPercentage: 5,
  activePatients: 60,
  activePatientsVariationPercentage: 8,
  occupancyRate: 0.78,
  occupancyVariationPercentage: 1.2,
  satisfactionScore: 4.5,
  satisfactionVariationPercentage: 0.5,
  rankingPosition: 1,
  trendDirection: 'upward',
  trendPercentage: 10,
  benchmarkValue: 10000,
  benchmarkGapPercentage: 20,
  benchmarkPercentile: 95,
  ...overrides,
});

const createProjection = (
  overrides: Partial<ClinicForecastProjection> = {},
): ClinicForecastProjection => ({
  clinicId: 'clinic-1',
  month: '2025-02',
  projectedRevenue: 15000,
  projectedAppointments: 90,
  projectedOccupancyRate: 0.82,
  ...overrides,
});

describe('GetClinicDashboardUseCase', () => {
  let metricsRepository: Mocked<IClinicMetricsRepository>;
  let compareUseCase: Mocked<ICompareClinicsUseCase>;
  let useCase: GetClinicDashboardUseCase;

  beforeEach(() => {
    metricsRepository = {
      getDashboardSnapshot: jest.fn(),
      getComparison: jest.fn(),
      getForecast: jest.fn(),
      recordAlert: jest.fn(),
      resolveAlert: jest.fn(),
      listAlerts: jest.fn(),
    } as unknown as Mocked<IClinicMetricsRepository>;

    compareUseCase = {
      execute: jest.fn(),
      executeOrThrow: jest.fn(),
    } as unknown as Mocked<ICompareClinicsUseCase>;

    useCase = new GetClinicDashboardUseCase(metricsRepository, compareUseCase);
  });

  it('retorna snapshot basico quando sem flags adicionais', async () => {
    const snapshot = createSnapshot({
      alerts: [createAlert()],
    });
    metricsRepository.getDashboardSnapshot.mockResolvedValue(snapshot);

    const response = await useCase.executeOrThrow({ tenantId: 'tenant-1' });

    expect(metricsRepository.getDashboardSnapshot).toHaveBeenCalledWith({ tenantId: 'tenant-1' });
    expect(response.alerts).toHaveLength(1);
    expect(response.comparisons).toBeUndefined();
    expect(response.forecast).toBeUndefined();
    expect(compareUseCase.executeOrThrow).not.toHaveBeenCalled();
  });

  it('carrega comparativo quando includeComparisons=true', async () => {
    const snapshot = createSnapshot();
    metricsRepository.getDashboardSnapshot.mockResolvedValue(snapshot);
    compareUseCase.executeOrThrow.mockImplementation(async (params) => [
      createComparisonEntry({ name: `Clinica ${params.metric}` }),
    ]);

    const from = new Date('2025-01-01T00:00:00Z');
    const to = new Date('2025-01-31T23:59:59Z');

    const response = await useCase.executeOrThrow({
      tenantId: 'tenant-1',
      filters: { clinicIds: ['clinic-1'], from, to },
      includeComparisons: true,
    });

    expect(compareUseCase.executeOrThrow).toHaveBeenCalledTimes(5);
    expect(compareUseCase.executeOrThrow).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        tenantId: 'tenant-1',
        clinicIds: ['clinic-1'],
        metric: 'revenue',
        period: { start: from, end: to },
      }),
    );
    expect(compareUseCase.executeOrThrow).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        tenantId: 'tenant-1',
        clinicIds: ['clinic-1'],
        metric: 'appointments',
        period: { start: from, end: to },
      }),
    );
    expect(compareUseCase.executeOrThrow).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        tenantId: 'tenant-1',
        clinicIds: ['clinic-1'],
        metric: 'patients',
        period: { start: from, end: to },
      }),
    );
    expect(compareUseCase.executeOrThrow).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        tenantId: 'tenant-1',
        clinicIds: ['clinic-1'],
        metric: 'occupancy',
        period: { start: from, end: to },
      }),
    );
    expect(compareUseCase.executeOrThrow).toHaveBeenNthCalledWith(
      5,
      expect.objectContaining({
        tenantId: 'tenant-1',
        clinicIds: ['clinic-1'],
        metric: 'satisfaction',
        period: { start: from, end: to },
      }),
    );

    expect(response.comparisons).toBeDefined();
    expect(response.comparisons?.metrics).toHaveLength(5);
    expect(response.comparisons?.metrics[0].metric).toBe('revenue');
    expect(response.comparisons?.metrics[0].entries).toHaveLength(1);
    expect(response.comparisons?.metrics[0].entries[0].name).toBe('Clinica revenue');
    expect(response.comparisons?.metrics.map((metric) => metric.metric)).toEqual([
      'revenue',
      'appointments',
      'patients',
      'occupancy',
      'satisfaction',
    ]);
    expect(response.comparisons?.period.start).toEqual(from);
    expect(response.comparisons?.period.end).toEqual(to);
    expect(response.comparisons?.previousPeriod.end.getTime()).toBeLessThan(from.getTime());
  });

  it('respeita metrics customizados no comparativo', async () => {
    const snapshot = createSnapshot();
    metricsRepository.getDashboardSnapshot.mockResolvedValue(snapshot);
    compareUseCase.executeOrThrow.mockResolvedValue([createComparisonEntry()]);

    const response = await useCase.executeOrThrow({
      tenantId: 'tenant-1',
      includeComparisons: true,
      comparisonMetrics: ['occupancy', 'occupancy', 'satisfaction'],
    });

    expect(compareUseCase.executeOrThrow).toHaveBeenCalledTimes(2);
    expect(compareUseCase.executeOrThrow).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        metric: 'occupancy',
      }),
    );
    expect(compareUseCase.executeOrThrow).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        metric: 'satisfaction',
      }),
    );

    expect(response.comparisons?.metrics).toHaveLength(2);
    expect(response.comparisons?.metrics?.map((metric) => metric.metric)).toEqual([
      'occupancy',
      'satisfaction',
    ]);
  });

  it('carrega forecast quando includeForecast=true', async () => {
    const snapshot = createSnapshot();
    metricsRepository.getDashboardSnapshot.mockResolvedValue(snapshot);
    metricsRepository.getForecast.mockResolvedValue([createProjection()]);

    const forecastFrom = new Date('2025-02-01T00:00:00Z');
    const forecastTo = new Date('2025-02-28T23:59:59Z');

    const response = await useCase.executeOrThrow({
      tenantId: 'tenant-1',
      filters: { from: forecastFrom, to: forecastTo },
      includeForecast: true,
    });

    expect(metricsRepository.getForecast).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      filters: { from: forecastFrom, to: forecastTo },
      includeForecast: true,
    });

    expect(response.forecast).toBeDefined();
    expect(response.forecast?.projections).toHaveLength(1);
    expect(response.forecast?.period.start).toEqual(forecastFrom);
    expect(response.forecast?.period.end).toEqual(forecastTo);
  });
});
