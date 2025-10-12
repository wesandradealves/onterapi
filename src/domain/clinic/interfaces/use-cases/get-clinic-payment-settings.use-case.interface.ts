import { Result } from '../../../../shared/types/result.type';
import { ClinicConfigurationVersion } from '../../types/clinic.types';

export interface GetClinicPaymentSettingsInput {
  clinicId: string;
  tenantId: string;
}

export interface IGetClinicPaymentSettingsUseCase {
  execute(input: GetClinicPaymentSettingsInput): Promise<Result<ClinicConfigurationVersion>>;
  executeOrThrow(input: GetClinicPaymentSettingsInput): Promise<ClinicConfigurationVersion>;
}

export const IGetClinicPaymentSettingsUseCase = Symbol('IGetClinicPaymentSettingsUseCase');
