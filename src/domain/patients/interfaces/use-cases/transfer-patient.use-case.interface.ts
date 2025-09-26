import { Result } from '../../../../shared/types/result.type';
import { Patient, TransferPatientInput } from '../../types/patient.types';

export interface ITransferPatientUseCase {
  execute(input: TransferPatientInput): Promise<Result<Patient>>;
}

export const ITransferPatientUseCase = Symbol('ITransferPatientUseCase');
