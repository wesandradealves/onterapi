import { Result } from '../../../../shared/types/result.type';
import { Clinic } from '../../types/clinic.types';

export interface IGetClinicUseCase {
  execute(input: { clinicId: string; tenantId: string }): Promise<Result<Clinic>>;
  executeOrThrow(input: { clinicId: string; tenantId: string }): Promise<Clinic>;
}

export const IGetClinicUseCase = Symbol('IGetClinicUseCase');
