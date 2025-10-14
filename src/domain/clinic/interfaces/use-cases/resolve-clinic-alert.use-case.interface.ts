import { Result } from '../../../../shared/types/result.type';
import { ClinicAlert, ResolveClinicAlertInput } from '../../types/clinic.types';

export interface IResolveClinicAlertUseCase {
  execute(input: ResolveClinicAlertInput): Promise<Result<ClinicAlert>>;
  executeOrThrow(input: ResolveClinicAlertInput): Promise<ClinicAlert>;
}

export const IResolveClinicAlertUseCase = Symbol('IResolveClinicAlertUseCase');
