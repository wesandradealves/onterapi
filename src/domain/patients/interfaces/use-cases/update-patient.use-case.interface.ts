import { Result } from '../../../../shared/types/result.type';
import { Patient, UpdatePatientInput } from '../../types/patient.types';

export interface IUpdatePatientUseCase {
  execute(input: UpdatePatientInput): Promise<Result<Patient>>;
}

export const IUpdatePatientUseCase = Symbol('IUpdatePatientUseCase');
