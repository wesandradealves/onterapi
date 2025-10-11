import { Result } from '../../../../shared/types/result.type';
import { ClinicAlert, TriggerClinicAlertInput } from '../../types/clinic.types';

export interface ITriggerClinicAlertUseCase {
  execute(input: TriggerClinicAlertInput): Promise<Result<ClinicAlert>>;
  executeOrThrow(input: TriggerClinicAlertInput): Promise<ClinicAlert>;
}

export const ITriggerClinicAlertUseCase = Symbol('ITriggerClinicAlertUseCase');
