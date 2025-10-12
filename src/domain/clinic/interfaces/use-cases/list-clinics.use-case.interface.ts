import { Result } from '../../../../shared/types/result.type';
import { Clinic, ClinicStatus } from '../../types/clinic.types';

export interface IListClinicsUseCase {
  execute(input: {
    tenantId: string;
    status?: ClinicStatus[];
    search?: string;
    page?: number;
    limit?: number;
    includeDeleted?: boolean;
  }): Promise<Result<{ data: Clinic[]; total: number }>>;
  executeOrThrow(input: {
    tenantId: string;
    status?: ClinicStatus[];
    search?: string;
    page?: number;
    limit?: number;
    includeDeleted?: boolean;
  }): Promise<{ data: Clinic[]; total: number }>;
}

export const IListClinicsUseCase = Symbol('IListClinicsUseCase');
