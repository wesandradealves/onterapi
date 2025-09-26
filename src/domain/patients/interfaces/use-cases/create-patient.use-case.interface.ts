import { Result } from '../../../../shared/types/result.type';
import { CreatePatientInput, Patient } from '../../types/patient.types';

export interface ICreatePatientUseCase {
  execute(input: CreatePatientInput): Promise<Result<Patient>>;
}

export const ICreatePatientUseCase = Symbol('ICreatePatientUseCase');
