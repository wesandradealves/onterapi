import { Result } from '../../../../shared/types/result.type';
import {
  ClinicConfigurationVersion,
  UpdateClinicGeneralSettingsInput,
} from '../../types/clinic.types';

export interface IUpdateClinicGeneralSettingsUseCase {
  execute(input: UpdateClinicGeneralSettingsInput): Promise<Result<ClinicConfigurationVersion>>;
  executeOrThrow(input: UpdateClinicGeneralSettingsInput): Promise<ClinicConfigurationVersion>;
}

export const IUpdateClinicGeneralSettingsUseCase = Symbol(
  'IUpdateClinicGeneralSettingsUseCase',
);
