import { Result } from '../../../../shared/types/result.type';
import { ClinicServiceTypeDefinition } from '../../types/clinic.types';

export interface IListClinicServiceTypesUseCase {
  execute(input: {
    clinicId: string;
    tenantId: string;
    includeInactive?: boolean;
  }): Promise<Result<ClinicServiceTypeDefinition[]>>;
  executeOrThrow(input: {
    clinicId: string;
    tenantId: string;
    includeInactive?: boolean;
  }): Promise<ClinicServiceTypeDefinition[]>;
}

export const IListClinicServiceTypesUseCase = Symbol('IListClinicServiceTypesUseCase');
