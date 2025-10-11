import { Result } from '../../../../shared/types/result.type';
import {
  ClinicConfigurationVersion,
  UpdateClinicTeamSettingsInput,
} from '../../types/clinic.types';

export interface IUpdateClinicTeamSettingsUseCase {
  execute(input: UpdateClinicTeamSettingsInput): Promise<Result<ClinicConfigurationVersion>>;
  executeOrThrow(input: UpdateClinicTeamSettingsInput): Promise<ClinicConfigurationVersion>;
}

export const IUpdateClinicTeamSettingsUseCase = Symbol('IUpdateClinicTeamSettingsUseCase');
