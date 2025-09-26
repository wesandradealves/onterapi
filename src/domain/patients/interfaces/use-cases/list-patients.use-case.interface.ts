import { Result } from '../../../../shared/types/result.type';
import { PatientListFilters, PatientListItem } from '../../types/patient.types';

export interface IListPatientsUseCase {
  execute(params: {
    tenantId: string;
    requesterId: string;
    requesterRole: string;
    filters?: PatientListFilters;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<Result<{ data: PatientListItem[]; total: number }>>;
}

export const IListPatientsUseCase = Symbol('IListPatientsUseCase');
