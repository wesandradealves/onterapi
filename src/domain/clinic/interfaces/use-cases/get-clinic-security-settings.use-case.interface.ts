import { Result } from '../../../../shared/types/result.type';
import { ClinicConfigurationVersion } from '../../types/clinic.types';

export interface GetClinicSecuritySettingsInput {
  clinicId: string;
  tenantId: string;
}

export interface IGetClinicSecuritySettingsUseCase {
  execute(input: GetClinicSecuritySettingsInput): Promise<Result<ClinicConfigurationVersion>>;
  executeOrThrow(input: GetClinicSecuritySettingsInput): Promise<ClinicConfigurationVersion>;
}

export const IGetClinicSecuritySettingsUseCase = Symbol('IGetClinicSecuritySettingsUseCase');
