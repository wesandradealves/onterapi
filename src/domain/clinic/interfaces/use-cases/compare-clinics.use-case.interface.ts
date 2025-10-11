import { Result } from '../../../../shared/types/result.type';
import { ClinicComparisonEntry, ClinicComparisonQuery } from '../../types/clinic.types';

export interface ICompareClinicsUseCase {
  execute(query: ClinicComparisonQuery): Promise<Result<ClinicComparisonEntry[]>>;
  executeOrThrow(query: ClinicComparisonQuery): Promise<ClinicComparisonEntry[]>;
}

export const ICompareClinicsUseCase = Symbol('ICompareClinicsUseCase');
