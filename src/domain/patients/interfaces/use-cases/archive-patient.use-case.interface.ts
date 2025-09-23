import { Result } from '../../../../shared/types/result.type';
import { ArchivePatientInput } from '../../types/patient.types';

export interface IArchivePatientUseCase {
  execute(input: ArchivePatientInput): Promise<Result<void>>;
}

export const IArchivePatientUseCase = Symbol('IArchivePatientUseCase');
