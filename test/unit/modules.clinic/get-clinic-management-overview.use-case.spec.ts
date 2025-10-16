import { GetClinicManagementOverviewUseCase } from '../../../src/modules/clinic/use-cases/get-clinic-management-overview.use-case';
import { IClinicRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic.repository.interface';
import { IClinicMetricsRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-metrics.repository.interface';
import { IClinicMemberRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-member.repository.interface';
import {
  Clinic,
  ClinicDashboardForecast,
  ClinicDashboardSnapshot,
  ClinicManagementOverviewQuery,
} from '../../../src/domain/clinic/types/clinic.types';
import { RolesEnum } from '../../../src/domain/auth/enums/roles.enum';

type Mocked<T> = jest.Mocked<T>;

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
  }) as Clinic & Record<string, unknown>;

describe('GetClinicManagementOverviewUseCase', () => {
  let clinicRepository: Mocked<IClinicRepository>;
  let clinicMetricsRepository: Mocked<IClinicMetricsRepository>;
  let clinicMemberRepository: Mocked<IClinicMemberRepository>;
  let useCase: GetClinicManagementOverviewUseCase;

  beforeEach(() => {
    clinicRepository = {
      list: jest.fn(),
      findByIds: jest.fn(),
    } as unknown as Mocked<IClinicRepository>;

    clinicMetricsRepository = {
      getDashboardSnapshot: jest.fn(),
      getComparison: jest.fn(),
      getForecast: jest.fn(),
      getFinancialSummary: jest.fn(),
    } as unknown as Mocked<IClinicMetricsRepository>;

    clinicMemberRepository = {
      countByRole: jest.fn(),
    } as unknown as Mocked<IClinicMemberRepository>;

    useCase = new GetClinicManagementOverviewUseCase(
      clinicMetricsRepository,
      clinicRepository,
      clinicMemberRepository,
    );
  });

  it('nio carrega resumo financeiro quando includeFinancials i falso', async () => {
    const snapshot: ClinicDashboardSnapshot = {
      period: {
        start: new Date('2025-03-01T00:00:00Z'),
        end: new Date('2025-03-31T23:59:59Z'),
      },
      totals: {
        clinics: 1,
        professionals: 3,
        activePatients: 60,
        revenue: 6000,
      },
      metrics: [
        {
          clinicId: 'clinic-a',
          month: '2025-03',
          revenue: 6000,
          appointments: 80,
          activePatients: 60,
          occupancyRate: 0.72,
          satisfactionScore: 4.1,
          contributionMargin: 0.22,
        },
      ],
      alerts: [],
    };

    const clinic = createClinic();

    clinicMetricsRepository.getDashboardSnapshot.mockResolvedValue(snapshot);
    clinicRepository.list.mockResolvedValue({
      data: [clinic],
      total: 1,
    });
    clinicRepository.findByIds.mockResolvedValue([]);

    const input: ClinicManagementOverviewQuery = {
      tenantId: 'tenant-1',
      includeFinancials: false,
      includeTeamDistribution: false,
      includeAlerts: false,
    };

    const overview = await useCase.executeOrThrow(input);

    expect(clinicMetricsRepository.getFinancialSummary).not.toHaveBeenCalled();
    expect(overview.financials).toBeUndefined();
    expect(overview.clinics).toHaveLength(1);
    expect(overview.clinics[0].financials).toBeUndefined();
    expect(clinicMemberRepository.countByRole).not.toHaveBeenCalled();
    expect(overview.clinics[0].teamDistribution).toBeUndefined();
    expect(overview.alerts).toHaveLength(0);
  });

  it('produz overview consolidado com mitricas, comparativos, forecast e metadados de template', async () => {
    const snapshot: ClinicDashboardSnapshot = {
      period: {
        start: new Date('2025-01-01T00:00:00Z'),
        end: new Date('2025-01-31T23:59:59Z'),
      },
      totals: {
        clinics: 2,
        professionals: 8,
        activePatients: 120,
        revenue: 18000,
      },
      metrics: [
        {
          clinicId: 'clinic-a',
          month: '2025-01',
          revenue: 10000,
          appointments: 140,
          activePatients: 80,
          occupancyRate: 0.8,
          satisfactionScore: 4.5,
          contributionMargin: 0.3,
        },
        {
          clinicId: 'clinic-b',
          month: '2025-01',
          revenue: 8000,
          appointments: 100,
          activePatients: 40,
          occupancyRate: 0.7,
          satisfactionScore: 4.2,
          contributionMargin: 0.25,
        },
      ],
      alerts: [
        {
          id: 'alert-1',
          clinicId: 'clinic-a',
          type: 'revenue_drop',
          channel: 'in_app',
          triggeredAt: new Date('2025-01-15T12:00:00Z'),
          resolvedAt: undefined,
          payload: { value: -12 },
        },
      ],
    };

    clinicMetricsRepository.getDashboardSnapshot.mockResolvedValue(snapshot);
    clinicMetricsRepository.getFinancialSummary.mockResolvedValue({
      totalRevenue: 18000,
      totalExpenses: 9000,
      totalProfit: 9000,
      averageMargin: 49.88,
      clinics: [
        {
          clinicId: 'clinic-a',
          revenue: 10000,
          expenses: 4500,
          profit: 5500,
          margin: 55,
          contributionPercentage: (10000 / 18000) * 100,
        },
        {
          clinicId: 'clinic-b',
          revenue: 8000,
          expenses: 4500,
          profit: 3500,
          margin: 43.75,
          contributionPercentage: (8000 / 18000) * 100,
        },
      ],
    });

    const comparisonEntry = {
      clinicId: 'clinic-a',
      name: 'Clinic A',
      revenue: 10000,
      revenueVariationPercentage: 10,
      appointments: 140,
      appointmentsVariationPercentage: 8,
      activePatients: 80,
      activePatientsVariationPercentage: 5,
      occupancyRate: 0.8,
      occupancyVariationPercentage: 3,
      satisfactionScore: 4.5,
      satisfactionVariationPercentage: 2,
      rankingPosition: 1,
    };

    clinicMetricsRepository.getComparison.mockResolvedValue([comparisonEntry]);

    const forecast: ClinicDashboardForecast = {
      period: {
        start: new Date('2025-02-01T00:00:00Z'),
        end: new Date('2025-02-28T23:59:59Z'),
      },
      projections: [
        {
          clinicId: 'clinic-a',
          month: '2025-02',
          projectedRevenue: 11000,
          projectedAppointments: 150,
          projectedOccupancyRate: 0.82,
        },
      ],
    };

    clinicMetricsRepository.getForecast.mockResolvedValue(forecast.projections);

    const clinicA = createClinic({
      id: 'clinic-a',
      metadata: {
        templatePropagation: {
          templateClinicId: 'template-1',
          lastPropagationAt: '2025-01-02T10:00:00Z',
          lastTriggeredBy: 'user-1',
          sections: {
            general: {
              templateVersionId: 'tv-1',
              templateVersionNumber: 3,
              propagatedVersionId: 'pv-1',
              propagatedAt: '2025-01-02T10:00:00Z',
              triggeredBy: 'user-1',
              override: {
                overrideId: 'ov-1',
                overrideVersion: 2,
                overrideHash: 'hash-123',
                updatedAt: '2025-01-03T09:00:00Z',
                updatedBy: 'user-2',
                appliedConfigurationVersionId: 'cv-1',
              },
            },
          },
        },
      },
    });

    const clinicB = createClinic({
      id: 'clinic-b',
      name: 'Clinic B',
      slug: 'clinic-b',
      status: 'active',
      primaryOwnerId: 'owner-2',
    });

    clinicRepository.list.mockResolvedValue({
      data: [clinicA, clinicB],
      total: 2,
    });
    clinicRepository.findByIds.mockResolvedValue([]);

    clinicMemberRepository.countByRole.mockImplementation(async (clinicId: string) => {
      if (clinicId === 'clinic-a') {
        return {
          [RolesEnum.CLINIC_OWNER]: 1,
          [RolesEnum.MANAGER]: 2,
          [RolesEnum.PROFESSIONAL]: 5,
          [RolesEnum.SECRETARY]: 1,
        } as Record<RolesEnum, number>;
      }

      return {
        [RolesEnum.CLINIC_OWNER]: 1,
        [RolesEnum.MANAGER]: 1,
        [RolesEnum.PROFESSIONAL]: 3,
        [RolesEnum.SECRETARY]: 1,
      } as Record<RolesEnum, number>;
    });

    const input: ClinicManagementOverviewQuery = {
      tenantId: 'tenant-1',
      includeComparisons: true,
      includeForecast: true,
    };

    const overview = await useCase.executeOrThrow(input);

    expect(overview.period).toEqual(snapshot.period);
    expect(overview.totals).toEqual(snapshot.totals);
    expect(overview.clinics).toHaveLength(2);
    expect(overview.financials?.totalRevenue).toBe(18000);

    const [summaryA, summaryB] = overview.clinics;

    expect(summaryA.clinicId).toBe('clinic-a');
    expect(summaryA.metrics.revenue).toBe(10000);
    expect(summaryA.metrics.occupancyRate).toBeCloseTo(0.8);
    expect(summaryA.metrics.satisfactionScore).toBeCloseTo(4.5);
    expect(summaryA.metrics.contributionMargin).toBeCloseTo(0.3);
    expect(summaryA.teamDistribution).toEqual([
      { role: RolesEnum.CLINIC_OWNER, count: 1 },
      { role: RolesEnum.MANAGER, count: 2 },
      { role: RolesEnum.PROFESSIONAL, count: 5 },
      { role: RolesEnum.SECRETARY, count: 1 },
    ]);
    expect(summaryA.template).toBeDefined();
    expect(summaryA.template?.sections[0].override?.overrideId).toBe('ov-1');
    expect(summaryA.financials?.revenue).toBe(10000);
    expect(summaryA.alerts).toHaveLength(1);

    expect(summaryB.clinicId).toBe('clinic-b');
    expect(summaryB.metrics.revenue).toBe(8000);
    expect(summaryB.financials?.revenue).toBe(8000);
    expect(summaryB.alerts).toHaveLength(0);

    expect(overview.comparisons).toBeDefined();
    expect(overview.comparisons?.metrics[0].entries[0]).toMatchObject({
      clinicId: 'clinic-a',
      revenueVariationPercentage: 10,
    });

    expect(overview.forecast).toBeDefined();
    expect(overview.forecast?.projections[0]).toMatchObject({
      clinicId: 'clinic-a',
      projectedRevenue: 11000,
    });

    expect(clinicMemberRepository.countByRole).toHaveBeenCalledTimes(2);
    expect(clinicMetricsRepository.getComparison).toHaveBeenCalled();
    expect(clinicMetricsRepository.getForecast).toHaveBeenCalled();
  });

  it('aplica filtro de clinicas, recalcula totais e filtra comparativos/forecast/alertas', async () => {
    const snapshot: ClinicDashboardSnapshot = {
      period: {
        start: new Date('2025-01-01T00:00:00Z'),
        end: new Date('2025-01-31T23:59:59Z'),
      },
      totals: {
        clinics: 2,
        professionals: 8,
        activePatients: 120,
        revenue: 18000,
      },
      metrics: [
        {
          clinicId: 'clinic-a',
          month: '2025-01',
          revenue: 10000,
          appointments: 140,
          activePatients: 80,
          occupancyRate: 0.8,
          satisfactionScore: 4.5,
          contributionMargin: 0.3,
        },
        {
          clinicId: 'clinic-b',
          month: '2025-01',
          revenue: 8000,
          appointments: 100,
          activePatients: 40,
          occupancyRate: 0.7,
          satisfactionScore: 4.2,
          contributionMargin: 0.25,
        },
      ],
      alerts: [
        {
          id: 'alert-a',
          clinicId: 'clinic-a',
          type: 'revenue_drop',
          channel: 'in_app',
          triggeredAt: new Date('2025-01-10T12:00:00Z'),
          resolvedAt: undefined,
          payload: { value: -10 },
        },
        {
          id: 'alert-b',
          clinicId: 'clinic-b',
          type: 'compliance',
          channel: 'email',
          triggeredAt: new Date('2025-01-20T12:00:00Z'),
          resolvedAt: undefined,
          payload: { documents: ['crm'] },
        },
      ],
    };

    clinicMetricsRepository.getDashboardSnapshot.mockResolvedValue(snapshot);

    clinicMetricsRepository.getComparison.mockResolvedValue([
      {
        clinicId: 'clinic-a',
        name: 'Clinic A',
        revenue: 10000,
        revenueVariationPercentage: 5,
        appointments: 140,
        appointmentsVariationPercentage: 4,
        activePatients: 80,
        activePatientsVariationPercentage: 3,
        occupancyRate: 0.8,
        occupancyVariationPercentage: 2,
        satisfactionScore: 4.5,
        satisfactionVariationPercentage: 1,
        rankingPosition: 1,
      },
      {
        clinicId: 'clinic-b',
        name: 'Clinic B',
        revenue: 8000,
        revenueVariationPercentage: 7,
        appointments: 100,
        appointmentsVariationPercentage: 5,
        activePatients: 40,
        activePatientsVariationPercentage: 4,
        occupancyRate: 0.7,
        occupancyVariationPercentage: 1,
        satisfactionScore: 4.2,
        satisfactionVariationPercentage: 0.5,
        rankingPosition: 2,
      },
    ]);

    clinicMetricsRepository.getForecast.mockResolvedValue([
      {
        clinicId: 'clinic-a',
        month: '2025-02',
        projectedRevenue: 10500,
        projectedAppointments: 130,
        projectedOccupancyRate: 0.78,
      },
      {
        clinicId: 'clinic-b',
        month: '2025-02',
        projectedRevenue: 8200,
        projectedAppointments: 110,
        projectedOccupancyRate: 0.73,
      },
    ]);

    clinicMetricsRepository.getFinancialSummary.mockResolvedValue({
      totalRevenue: 8000,
      totalExpenses: 3500,
      totalProfit: 4500,
      averageMargin: 56.25,
      clinics: [
        {
          clinicId: 'clinic-b',
          revenue: 8000,
          expenses: 3500,
          profit: 4500,
          margin: 56.25,
          contributionPercentage: 100,
        },
      ],
    });

    const clinicB = createClinic({
      id: 'clinic-b',
      name: 'Clinic B',
      slug: 'clinic-b',
      status: 'active',
      primaryOwnerId: 'owner-2',
    });

    clinicRepository.list.mockResolvedValue({ data: [], total: 0 });
    clinicRepository.findByIds.mockResolvedValue([clinicB]);

    clinicMemberRepository.countByRole.mockImplementation(async (clinicId: string) => {
      if (clinicId === 'clinic-b') {
        return {
          [RolesEnum.CLINIC_OWNER]: 1,
          [RolesEnum.MANAGER]: 1,
          [RolesEnum.PROFESSIONAL]: 3,
          [RolesEnum.SECRETARY]: 1,
        } as Record<RolesEnum, number>;
      }
      return {} as Record<RolesEnum, number>;
    });

    const input: ClinicManagementOverviewQuery = {
      tenantId: 'tenant-1',
      filters: { clinicIds: ['clinic-b'] },
      includeComparisons: true,
      includeForecast: true,
      includeAlerts: true,
    };

    const overview = await useCase.executeOrThrow(input);

    expect(overview.clinics).toHaveLength(1);
    expect(overview.clinics[0].clinicId).toBe('clinic-b');
    expect(overview.totals).toEqual({
      clinics: 1,
      professionals: 3,
      activePatients: 40,
      revenue: 8000,
    });
    expect(overview.financials?.totalRevenue).toBe(8000);
    expect(overview.clinics[0].financials?.margin).toBe(56.25);
    expect(overview.alerts).toHaveLength(1);
    expect(overview.alerts[0].clinicId).toBe('clinic-b');
    expect(overview.comparisons).toBeDefined();
    expect(overview?.comparisons?.metrics[0].entries).toHaveLength(1);
    expect(overview.comparisons?.metrics[0].entries[0].clinicId).toBe('clinic-b');
    expect(overview.forecast?.projections).toHaveLength(1);
    expect(overview.forecast?.projections[0].clinicId).toBe('clinic-b');
    expect(clinicMemberRepository.countByRole).toHaveBeenCalledWith('clinic-b');
  });
});
