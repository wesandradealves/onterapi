import { Result } from '../../../../shared/types/result.type';
import {
  AnamnesisHistoryData,
  AnamnesisHistoryFilters,
} from '../../../anamnesis/types/anamnesis.types';

export interface IGetAnamnesisHistoryUseCase {
  execute(params: {
    tenantId: string;
    patientId: string;
    requesterId: string;
    requesterRole: string;
    filters?: AnamnesisHistoryFilters;
  }): Promise<Result<AnamnesisHistoryData>>;
}

export const IGetAnamnesisHistoryUseCase = Symbol('IGetAnamnesisHistoryUseCase');
