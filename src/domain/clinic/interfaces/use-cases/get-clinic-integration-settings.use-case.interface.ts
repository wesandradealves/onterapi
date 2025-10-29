import { Result } from '../../../../shared/types/result.type';
import { ClinicConfigurationVersion } from '../../types/clinic.types';

export interface GetClinicIntegrationSettingsInput {
  clinicId: string;
  tenantId: string;
}

export interface IGetClinicIntegrationSettingsUseCase {
  execute(input: GetClinicIntegrationSettingsInput): Promise<Result<ClinicConfigurationVersion>>;
  executeOrThrow(input: GetClinicIntegrationSettingsInput): Promise<ClinicConfigurationVersion>;
}

export const IGetClinicIntegrationSettingsUseCase = Symbol('IGetClinicIntegrationSettingsUseCase');
