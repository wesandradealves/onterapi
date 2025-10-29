import { Result } from '../../../../shared/types/result.type';
import {
  ClinicConfigurationVersion,
  UpdateClinicPaymentSettingsInput,
} from '../../types/clinic.types';

export interface IUpdateClinicPaymentSettingsUseCase {
  execute(input: UpdateClinicPaymentSettingsInput): Promise<Result<ClinicConfigurationVersion>>;
  executeOrThrow(input: UpdateClinicPaymentSettingsInput): Promise<ClinicConfigurationVersion>;
}

export const IUpdateClinicPaymentSettingsUseCase = Symbol('IUpdateClinicPaymentSettingsUseCase');
