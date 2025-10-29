import { Result } from '../../../../shared/types/result.type';
import {
  ClinicConfigurationVersion,
  UpdateClinicServiceSettingsInput,
} from '../../types/clinic.types';

export interface IUpdateClinicServiceSettingsUseCase {
  execute(input: UpdateClinicServiceSettingsInput): Promise<Result<ClinicConfigurationVersion>>;
  executeOrThrow(input: UpdateClinicServiceSettingsInput): Promise<ClinicConfigurationVersion>;
}

export const IUpdateClinicServiceSettingsUseCase = Symbol('IUpdateClinicServiceSettingsUseCase');
