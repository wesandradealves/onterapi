import { ClinicAlertMonitorService } from '../../../src/modules/clinic/services/clinic-alert-monitor.service';
import { IClinicRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic.repository.interface';
import { IClinicMetricsRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-metrics.repository.interface';
import { ITriggerClinicAlertUseCase } from '../../../src/domain/clinic/interfaces/use-cases/trigger-clinic-alert.use-case.interface';
import { ClinicAlert } from '../../../src/domain/clinic/types/clinic.types';
import { IClinicMemberRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-member.repository.interface';
import { ClinicAuditService } from '../../../src/infrastructure/clinic/services/clinic-audit.service';
import { ICompareClinicsUseCase } from '../../../src/domain/clinic/interfaces/use-cases/compare-clinics.use-case.interface';

type Mocked<T> = jest.Mocked<T>;

const createConfigServiceMock = (overrides: Record<string, unknown> = {}) => {
  const defaults: Record<string, unknown> = {
    CLINIC_ALERT_WORKER_ENABLED: false,
    CLINIC_ALERT_WORKER_INTERVAL_MS: 600000,
    CLINIC_ALERT_LOOKBACK_DAYS: 30,
    CLINIC_ALERT_REVENUE_DROP_PERCENT: 20,
    CLINIC_ALERT_REVENUE_MIN: 5000,
    CLINIC_ALERT_OCCUPANCY_THRESHOLD: 0.55,
    CLINIC_ALERT_STAFF_MIN_PROFESSIONALS: 0,
    CLINIC_ALERT_COMPLIANCE_EXPIRY_DAYS: 30,
  };

  return {
    get: jest.fn((key: string) =>
      Object.prototype.hasOwnProperty.call(overrides, key) ? overrides[key] : defaults[key],
    ),
  };
};

const createComparisonEntry = (
  overrides: Partial<ReturnType<typeof baseComparisonEntry>> = {},
) => ({
  ...baseComparisonEntry(),
  ...overrides,
});

const baseComparisonEntry = () => ({
  clinicId: 'clinic-1',
  name: 'Clinic 1',
  revenue: 10000,
  revenueVariationPercentage: -25,
  appointments: 100,
  appointmentsVariationPercentage: -5,
  activePatients: 200,
  activePatientsVariationPercentage: -2,
  occupancyRate: 0.65,
  occupancyVariationPercentage: -3,
  satisfactionScore: 4.5,
  satisfactionVariationPercentage: 1,
  rankingPosition: 1,
  trendDirection: 'downward',
  trendPercentage: -5,
  benchmarkValue: 9500,
  benchmarkGapPercentage: 5.2631578947368425,
  benchmarkPercentile: 90,
});

describe('ClinicAlertMonitorService', () => {
  let configService: ReturnType<typeof createConfigServiceMock>;
  let clinicRepository: Mocked<IClinicRepository>;
  let clinicMetricsRepository: Mocked<IClinicMetricsRepository>;
  let compareUseCase: Mocked<ICompareClinicsUseCase>;
  let triggerAlertUseCase: Mocked<ITriggerClinicAlertUseCase>;
  let clinicMemberRepository: Mocked<IClinicMemberRepository>;
  let auditService: jest.Mocked<ClinicAuditService>;
  let service: ClinicAlertMonitorService;

  beforeEach(() => {
    configService = createConfigServiceMock({});

    clinicRepository = {
      listTenantIds: jest.fn(),
      listComplianceDocuments: jest.fn().mockResolvedValue({}),
    } as unknown as Mocked<IClinicRepository>;

    clinicMetricsRepository = {
      getComparison: jest.fn(),
      listAlerts: jest.fn(),
    } as unknown as Mocked<IClinicMetricsRepository>;

    compareUseCase = {
      execute: jest.fn(),
      executeOrThrow: jest.fn(),
    } as unknown as Mocked<ICompareClinicsUseCase>;

    clinicMemberRepository = {
      countActiveProfessionalsByClinics: jest.fn().mockResolvedValue({}),
    } as unknown as Mocked<IClinicMemberRepository>;

    triggerAlertUseCase = {
      executeOrThrow: jest.fn(),
    } as unknown as Mocked<ITriggerClinicAlertUseCase>;

    auditService = {
      register: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ClinicAuditService>;

    service = new ClinicAlertMonitorService(
      configService as any,
      clinicRepository,
      clinicMetricsRepository,
      clinicMemberRepository,
      compareUseCase,
      triggerAlertUseCase,
      auditService,
    );
  });

  it('dispara alerta de queda de receita quando variacao excede o limiar', async () => {
    compareUseCase.executeOrThrow.mockResolvedValueOnce([createComparisonEntry()]);
    clinicMetricsRepository.listAlerts.mockResolvedValueOnce([]);
    triggerAlertUseCase.executeOrThrow.mockResolvedValueOnce({
      id: 'alert-revenue',
      clinicId: 'clinic-1',
      tenantId: 'tenant-1',
      type: 'revenue_drop',
      channel: 'push',
      triggeredBy: 'user-1',
      triggeredAt: new Date(),
      payload: {},
    } as ClinicAlert);

    const result = await service.evaluateTenant({ tenantId: 'tenant-1' });

    expect(triggerAlertUseCase.executeOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        clinicId: 'clinic-1',
        type: 'revenue_drop',
        payload: expect.objectContaining({
          currentRevenue: 10000,
          variationPercentage: -25,
        }),
      }),
    );
    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0].type).toBe('revenue_drop');
    expect(result.skippedDetails).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'low_occupancy', reason: 'threshold_not_met' }),
      ]),
    );
  });

  it('dispara alerta de baixa ocupacao quando abaixo do limiar', async () => {
    compareUseCase.executeOrThrow.mockResolvedValueOnce([
      createComparisonEntry({ occupancyRate: 0.4, revenueVariationPercentage: -5 }),
    ]);
    clinicMetricsRepository.listAlerts.mockResolvedValueOnce([]);
    triggerAlertUseCase.executeOrThrow.mockResolvedValueOnce({
      id: 'alert-occupancy',
      clinicId: 'clinic-1',
      tenantId: 'tenant-1',
      type: 'low_occupancy',
      channel: 'push',
      triggeredBy: 'user-1',
      triggeredAt: new Date(),
      payload: {},
    } as ClinicAlert);

    const result = await service.evaluateTenant({ tenantId: 'tenant-1' });

    expect(triggerAlertUseCase.executeOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'low_occupancy',
        clinicId: 'clinic-1',
      }),
    );
    expect(result.alerts.some((alert) => alert.type === 'low_occupancy')).toBe(true);
    expect(result.skippedDetails).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'revenue_drop', reason: 'variation_within_threshold' }),
      ]),
    );
  });

  it('nao replica alerta quando ja existe alerta ativo do mesmo tipo', async () => {
    const activeAlert: ClinicAlert = {
      id: 'alert-1',
      clinicId: 'clinic-1',
      tenantId: 'tenant-1',
      type: 'revenue_drop',
      channel: 'push',
      triggeredBy: 'system',
      triggeredAt: new Date(),
      payload: {},
    };

    compareUseCase.executeOrThrow.mockResolvedValueOnce([createComparisonEntry()]);
    clinicMetricsRepository.listAlerts.mockResolvedValueOnce([activeAlert]);

    const result = await service.evaluateTenant({ tenantId: 'tenant-1' });

    expect(triggerAlertUseCase.executeOrThrow).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'revenue_drop' }),
    );
    expect(result.skippedDetails).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'revenue_drop', reason: 'alert_already_active' }),
      ]),
    );
  });

  it('dispara alerta de staff shortage quando profissionais abaixo do minimo', async () => {
    configService = createConfigServiceMock({
      CLINIC_ALERT_STAFF_MIN_PROFESSIONALS: 3,
    });

    clinicMemberRepository.countActiveProfessionalsByClinics.mockResolvedValueOnce({
      'clinic-1': 1,
    });

    triggerAlertUseCase.executeOrThrow.mockResolvedValueOnce({
      id: 'alert-staff',
      clinicId: 'clinic-1',
      tenantId: 'tenant-1',
      type: 'staff_shortage',
      channel: 'push',
      triggeredBy: 'user-1',
      triggeredAt: new Date(),
      payload: {},
    } as ClinicAlert);

    service = new ClinicAlertMonitorService(
      configService as any,
      clinicRepository,
      clinicMetricsRepository,
      clinicMemberRepository,
      compareUseCase,
      triggerAlertUseCase,
      auditService,
    );

    compareUseCase.executeOrThrow.mockResolvedValueOnce([
      createComparisonEntry({ occupancyRate: 0.7, revenueVariationPercentage: -5 }),
    ]);
    clinicMetricsRepository.listAlerts.mockResolvedValueOnce([]);

    const result = await service.evaluateTenant({ tenantId: 'tenant-1' });

    expect(triggerAlertUseCase.executeOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'staff_shortage',
        clinicId: 'clinic-1',
      }),
    );
    expect(result.alerts.some((alert) => alert.type === 'staff_shortage')).toBe(true);
    expect(result.skippedDetails).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'revenue_drop', reason: 'variation_within_threshold' }),
        expect.objectContaining({ type: 'low_occupancy', reason: 'threshold_not_met' }),
      ]),
    );
  });

  it('dispara alerta de compliance quando documento esta prestes a expirar', async () => {
    const now = new Date('2025-01-01T00:00:00Z');

    compareUseCase.executeOrThrow.mockResolvedValueOnce([
      createComparisonEntry({
        revenueVariationPercentage: -5,
        occupancyRate: 0.7,
      }),
    ]);

    clinicRepository.listComplianceDocuments.mockResolvedValueOnce({
      'clinic-1': [
        {
          type: 'cnpj',
          required: true,
          status: 'valid',
          expiresAt: new Date('2025-01-20T00:00:00Z'),
        },
      ],
    });

    clinicMetricsRepository.listAlerts.mockResolvedValueOnce([]);

    triggerAlertUseCase.executeOrThrow.mockResolvedValueOnce({
      id: 'alert-compliance',
      clinicId: 'clinic-1',
      tenantId: 'tenant-1',
      type: 'compliance',
      channel: 'push',
      triggeredBy: 'system',
      triggeredAt: now,
      payload: {},
    } as ClinicAlert);

    const result = await service.evaluateTenant({ tenantId: 'tenant-1', now });

    expect(triggerAlertUseCase.executeOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'compliance',
        clinicId: 'clinic-1',
      }),
    );
    expect(result.alerts.some((alert) => alert.type === 'compliance')).toBe(true);
    expect(result.skippedDetails).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'revenue_drop', reason: 'variation_within_threshold' }),
        expect.objectContaining({ type: 'low_occupancy', reason: 'threshold_not_met' }),
      ]),
    );
  });
});
