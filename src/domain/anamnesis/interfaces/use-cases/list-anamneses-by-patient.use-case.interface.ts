import { Result } from '../../../../shared/types/result.type';
import { AnamnesisListFilters, AnamnesisListItem } from '../../../anamnesis/types/anamnesis.types';

export interface IListAnamnesesByPatientUseCase {
  execute(params: {
    tenantId: string;
    patientId: string;
    requesterId: string;
    requesterRole: string;
    filters?: AnamnesisListFilters;
  }): Promise<Result<AnamnesisListItem[]>>;
}

export const IListAnamnesesByPatientUseCase = Symbol('IListAnamnesesByPatientUseCase');
