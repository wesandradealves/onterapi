import { Result } from '../../../../shared/types/result.type';
import { ClinicAlert } from '../../types/clinic.types';

export interface EvaluateClinicAlertsInput {
  tenantId: string;
  clinicIds?: string[];
  triggeredBy: string;
}

export interface EvaluateClinicAlertsOutput {
  tenantId: string;
  evaluatedClinics: number;
  triggered: number;
  skipped: number;
  alerts: ClinicAlert[];
  skippedDetails: Array<{
    clinicId: string;
    type: ClinicAlert['type'];
    reason: string;
  }>;
}

export interface IEvaluateClinicAlertsUseCase {
  execute(input: EvaluateClinicAlertsInput): Promise<Result<EvaluateClinicAlertsOutput>>;
  executeOrThrow(input: EvaluateClinicAlertsInput): Promise<EvaluateClinicAlertsOutput>;
}

export const IEvaluateClinicAlertsUseCase = Symbol('IEvaluateClinicAlertsUseCase');
