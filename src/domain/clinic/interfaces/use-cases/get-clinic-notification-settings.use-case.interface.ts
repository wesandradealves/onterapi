import { Result } from '../../../../shared/types/result.type';
import { ClinicConfigurationVersion } from '../../types/clinic.types';

export interface GetClinicNotificationSettingsInput {
  clinicId: string;
  tenantId: string;
}

export interface IGetClinicNotificationSettingsUseCase {
  execute(input: GetClinicNotificationSettingsInput): Promise<Result<ClinicConfigurationVersion>>;
  executeOrThrow(input: GetClinicNotificationSettingsInput): Promise<ClinicConfigurationVersion>;
}

export const IGetClinicNotificationSettingsUseCase = Symbol(
  'IGetClinicNotificationSettingsUseCase',
);
