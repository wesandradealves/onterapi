import { Result } from '../../../../shared/types/result.type';
import { Anamnesis } from '../../../anamnesis/types/anamnesis.types';

export interface ISubmitAnamnesisUseCase {
  execute(params: {
    tenantId: string;
    anamnesisId: string;
    requesterId: string;
    requesterRole: string;
  }): Promise<Result<Anamnesis>>;
  executeOrThrow(params: {
    tenantId: string;
    anamnesisId: string;
    requesterId: string;
    requesterRole: string;
  }): Promise<Anamnesis>;
}

export const ISubmitAnamnesisUseCase = Symbol('ISubmitAnamnesisUseCase');
