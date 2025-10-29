import { Result } from '../../../../shared/types/result.type';
import {
  ClinicConfigurationVersion,
  UpdateClinicScheduleSettingsInput,
} from '../../types/clinic.types';

export interface IUpdateClinicScheduleSettingsUseCase {
  execute(input: UpdateClinicScheduleSettingsInput): Promise<Result<ClinicConfigurationVersion>>;
  executeOrThrow(input: UpdateClinicScheduleSettingsInput): Promise<ClinicConfigurationVersion>;
}

export const IUpdateClinicScheduleSettingsUseCase = Symbol('IUpdateClinicScheduleSettingsUseCase');
