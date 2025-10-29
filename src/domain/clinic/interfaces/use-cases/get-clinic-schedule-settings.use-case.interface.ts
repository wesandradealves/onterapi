import { Result } from '../../../../shared/types/result.type';
import { ClinicConfigurationVersion } from '../../types/clinic.types';

export interface GetClinicScheduleSettingsInput {
  clinicId: string;
  tenantId: string;
}

export interface IGetClinicScheduleSettingsUseCase {
  execute(input: GetClinicScheduleSettingsInput): Promise<Result<ClinicConfigurationVersion>>;
  executeOrThrow(input: GetClinicScheduleSettingsInput): Promise<ClinicConfigurationVersion>;
}

export const IGetClinicScheduleSettingsUseCase = Symbol('IGetClinicScheduleSettingsUseCase');
