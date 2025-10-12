import { Result } from '../../../../shared/types/result.type';
import { Clinic, CreateClinicInput } from '../../types/clinic.types';

export interface ICreateClinicUseCase {
  execute(input: CreateClinicInput): Promise<Result<Clinic>>;
  executeOrThrow(input: CreateClinicInput): Promise<Clinic>;
}

export const ICreateClinicUseCase = Symbol('ICreateClinicUseCase');
