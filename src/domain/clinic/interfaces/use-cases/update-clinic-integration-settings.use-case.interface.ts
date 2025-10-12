import { Result } from '../../../../shared/types/result.type';
import {
  ClinicConfigurationVersion,
  UpdateClinicIntegrationSettingsInput,
} from '../../types/clinic.types';

export interface IUpdateClinicIntegrationSettingsUseCase {
  execute(input: UpdateClinicIntegrationSettingsInput): Promise<Result<ClinicConfigurationVersion>>;
  executeOrThrow(input: UpdateClinicIntegrationSettingsInput): Promise<ClinicConfigurationVersion>;
}

export const IUpdateClinicIntegrationSettingsUseCase = Symbol(
  'IUpdateClinicIntegrationSettingsUseCase',
);
