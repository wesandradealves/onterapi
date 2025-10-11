import { Result } from '../../../../shared/types/result.type';
import { Clinic, UpdateClinicHoldSettingsInput } from '../../types/clinic.types';

export interface IUpdateClinicHoldSettingsUseCase {
  execute(input: UpdateClinicHoldSettingsInput): Promise<Result<Clinic>>;
  executeOrThrow(input: UpdateClinicHoldSettingsInput): Promise<Clinic>;
}

export const IUpdateClinicHoldSettingsUseCase = Symbol('IUpdateClinicHoldSettingsUseCase');
