import { Result } from '../../../../shared/types/result.type';
import { ClinicConfigurationVersion } from '../../types/clinic.types';

export interface GetClinicBrandingSettingsInput {
  clinicId: string;
  tenantId: string;
}

export interface IGetClinicBrandingSettingsUseCase {
  execute(input: GetClinicBrandingSettingsInput): Promise<Result<ClinicConfigurationVersion>>;
  executeOrThrow(input: GetClinicBrandingSettingsInput): Promise<ClinicConfigurationVersion>;
}

export const IGetClinicBrandingSettingsUseCase = Symbol('IGetClinicBrandingSettingsUseCase');
