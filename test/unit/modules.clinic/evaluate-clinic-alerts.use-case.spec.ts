import { EvaluateClinicAlertsUseCase } from '../../../src/modules/clinic/use-cases/evaluate-clinic-alerts.use-case';
import { ClinicAlertMonitorService } from '../../../src/modules/clinic/services/clinic-alert-monitor.service';
import { ClinicAuditService } from '../../../src/infrastructure/clinic/services/clinic-audit.service';

describe('EvaluateClinicAlertsUseCase', () => {
  let monitor: jest.Mocked<ClinicAlertMonitorService>;
  let auditService: jest.Mocked<ClinicAuditService>;
  let useCase: EvaluateClinicAlertsUseCase;

  beforeEach(() => {
    monitor = {
      evaluateTenant: jest.fn(),
    } as unknown as jest.Mocked<ClinicAlertMonitorService>;

    auditService = {
      register: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ClinicAuditService>;

    useCase = new EvaluateClinicAlertsUseCase(monitor, auditService);
  });

  it('executa monitoramento com parametros informados', async () => {
    monitor.evaluateTenant.mockResolvedValue({
      tenantId: 'tenant-1',
      evaluatedClinics: 2,
      triggered: 1,
      skipped: 1,
      alerts: [],
      skippedDetails: [],
    });

    const input = {
      tenantId: 'tenant-1',
      clinicIds: ['clinic-1', 'clinic-2'],
      triggeredBy: 'user-1',
    };

    const result = await useCase.executeOrThrow(input);

    expect(monitor.evaluateTenant).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      clinicIds: ['clinic-1', 'clinic-2'],
      triggeredBy: 'user-1',
    });
    expect(result.triggered).toBe(1);
    expect(auditService.register).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        event: 'clinic.alerts.manual_evaluation',
        performedBy: 'user-1',
      }),
    );
    expect(result.skippedDetails).toEqual([]);
  });
});
