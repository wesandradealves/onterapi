import { Result } from '../../../../shared/types/result.type';
import { ClinicConfigurationVersion } from '../../types/clinic.types';

export interface GetClinicGeneralSettingsInput {
  clinicId: string;
  tenantId: string;
}

export interface IGetClinicGeneralSettingsUseCase {
  execute(input: GetClinicGeneralSettingsInput): Promise<Result<ClinicConfigurationVersion>>;
  executeOrThrow(input: GetClinicGeneralSettingsInput): Promise<ClinicConfigurationVersion>;
}

export const IGetClinicGeneralSettingsUseCase = Symbol('IGetClinicGeneralSettingsUseCase');
