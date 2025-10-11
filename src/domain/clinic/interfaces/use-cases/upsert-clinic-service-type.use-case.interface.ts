import { Result } from '../../../../shared/types/result.type';
import {
  ClinicServiceTypeDefinition,
  UpsertClinicServiceTypeInput,
} from '../../types/clinic.types';

export interface IUpsertClinicServiceTypeUseCase {
  execute(input: UpsertClinicServiceTypeInput): Promise<Result<ClinicServiceTypeDefinition>>;
  executeOrThrow(input: UpsertClinicServiceTypeInput): Promise<ClinicServiceTypeDefinition>;
}

export const IUpsertClinicServiceTypeUseCase = Symbol('IUpsertClinicServiceTypeUseCase');
