import { Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import {
  EvaluateClinicAlertsInput,
  EvaluateClinicAlertsOutput,
  IEvaluateClinicAlertsUseCase,
  IEvaluateClinicAlertsUseCase as IEvaluateClinicAlertsUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/evaluate-clinic-alerts.use-case.interface';
import { ClinicAlertMonitorService } from '../services/clinic-alert-monitor.service';
import { ClinicAuditService } from '../../../infrastructure/clinic/services/clinic-audit.service';

@Injectable()
export class EvaluateClinicAlertsUseCase
  extends BaseUseCase<EvaluateClinicAlertsInput, EvaluateClinicAlertsOutput>
  implements IEvaluateClinicAlertsUseCase
{
  protected readonly logger = new Logger(EvaluateClinicAlertsUseCase.name);

  constructor(
    private readonly monitor: ClinicAlertMonitorService,
    private readonly auditService: ClinicAuditService,
  ) {
    super();
  }

  protected async handle(input: EvaluateClinicAlertsInput): Promise<EvaluateClinicAlertsOutput> {
    const result = await this.monitor.evaluateTenant({
      tenantId: input.tenantId,
      clinicIds: input.clinicIds,
      triggeredBy: input.triggeredBy,
    });

    await this.auditService.register({
      tenantId: input.tenantId,
      event: 'clinic.alerts.manual_evaluation',
      performedBy: input.triggeredBy,
      detail: {
        clinicIds: input.clinicIds ?? [],
        triggered: result.triggered,
        skipped: result.skipped,
        alerts: result.alerts.map((alert) => ({
          alertId: alert.id,
          clinicId: alert.clinicId,
          type: alert.type,
        })),
        skippedDetails: result.skippedDetails,
      },
    });

    return result;
  }
}

export const EvaluateClinicAlertsUseCaseToken = IEvaluateClinicAlertsUseCaseToken;
