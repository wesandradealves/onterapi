import { Result } from '../../../../shared/types/result.type';
import {
  ClinicConfigurationVersion,
  UpdateClinicNotificationSettingsInput,
} from '../../types/clinic.types';

export interface IUpdateClinicNotificationSettingsUseCase {
  execute(
    input: UpdateClinicNotificationSettingsInput,
  ): Promise<Result<ClinicConfigurationVersion>>;
  executeOrThrow(
    input: UpdateClinicNotificationSettingsInput,
  ): Promise<ClinicConfigurationVersion>;
}

export const IUpdateClinicNotificationSettingsUseCase = Symbol(
  'IUpdateClinicNotificationSettingsUseCase',
);
