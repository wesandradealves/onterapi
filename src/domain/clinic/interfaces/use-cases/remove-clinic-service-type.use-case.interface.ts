import { Result } from '../../../../shared/types/result.type';
import { RemoveClinicServiceTypeInput } from '../../types/clinic.types';

export interface IRemoveClinicServiceTypeUseCase {
  execute(input: RemoveClinicServiceTypeInput): Promise<Result<void>>;
  executeOrThrow(input: RemoveClinicServiceTypeInput): Promise<void>;
}

export const IRemoveClinicServiceTypeUseCase = Symbol('IRemoveClinicServiceTypeUseCase');
