import { Result } from '../../../../shared/types/result.type';
import {
  ClinicConfigurationVersion,
  UpdateClinicBrandingSettingsInput,
} from '../../types/clinic.types';

export interface IUpdateClinicBrandingSettingsUseCase {
  execute(
    input: UpdateClinicBrandingSettingsInput,
  ): Promise<Result<ClinicConfigurationVersion>>;
  executeOrThrow(
    input: UpdateClinicBrandingSettingsInput,
  ): Promise<ClinicConfigurationVersion>;
}

export const IUpdateClinicBrandingSettingsUseCase = Symbol(
  'IUpdateClinicBrandingSettingsUseCase',
);
