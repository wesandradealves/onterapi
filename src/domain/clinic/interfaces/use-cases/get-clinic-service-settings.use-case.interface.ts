import { Result } from '../../../../shared/types/result.type';
import { ClinicConfigurationVersion } from '../../types/clinic.types';

export interface GetClinicServiceSettingsInput {
  clinicId: string;
  tenantId: string;
}

export interface IGetClinicServiceSettingsUseCase {
  execute(input: GetClinicServiceSettingsInput): Promise<Result<ClinicConfigurationVersion>>;
  executeOrThrow(input: GetClinicServiceSettingsInput): Promise<ClinicConfigurationVersion>;
}

export const IGetClinicServiceSettingsUseCase = Symbol('IGetClinicServiceSettingsUseCase');
