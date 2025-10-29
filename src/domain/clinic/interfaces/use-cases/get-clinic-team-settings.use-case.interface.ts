import { Result } from '../../../../shared/types/result.type';
import { ClinicConfigurationVersion } from '../../types/clinic.types';

export interface GetClinicTeamSettingsInput {
  clinicId: string;
  tenantId: string;
}

export interface IGetClinicTeamSettingsUseCase {
  execute(input: GetClinicTeamSettingsInput): Promise<Result<ClinicConfigurationVersion>>;
  executeOrThrow(input: GetClinicTeamSettingsInput): Promise<ClinicConfigurationVersion>;
}

export const IGetClinicTeamSettingsUseCase = Symbol('IGetClinicTeamSettingsUseCase');
