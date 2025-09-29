import { Result } from '../../../../shared/types/result.type';
import {
  AnamnesisStepTemplate,
  GetStepTemplatesFilters,
} from '../../../anamnesis/types/anamnesis.types';

export interface IListAnamnesisStepTemplatesUseCase {
  execute(params: {
    tenantId: string;
    requesterId: string;
    requesterRole: string;
    filters?: GetStepTemplatesFilters;
  }): Promise<Result<AnamnesisStepTemplate[]>>;
  executeOrThrow(params: {
    tenantId: string;
    requesterId: string;
    requesterRole: string;
    filters?: GetStepTemplatesFilters;
  }): Promise<AnamnesisStepTemplate[]>;
}

export const IListAnamnesisStepTemplatesUseCase = Symbol('IListAnamnesisStepTemplatesUseCase');
