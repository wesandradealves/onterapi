import { Result } from '../../../../shared/types/result.type';
import {
  ClinicConfigurationVersion,
  UpdateClinicSecuritySettingsInput,
} from '../../types/clinic.types';

export interface IUpdateClinicSecuritySettingsUseCase {
  execute(input: UpdateClinicSecuritySettingsInput): Promise<Result<ClinicConfigurationVersion>>;
  executeOrThrow(input: UpdateClinicSecuritySettingsInput): Promise<ClinicConfigurationVersion>;
}

export const IUpdateClinicSecuritySettingsUseCase = Symbol('IUpdateClinicSecuritySettingsUseCase');
