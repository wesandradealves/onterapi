import { Result } from '../../../../shared/types/result.type';
import { Anamnesis } from '../../../anamnesis/types/anamnesis.types';

export interface ISubmitAnamnesisUseCase {
  execute(params: {
    tenantId: string;
    anamnesisId: string;
    requesterId: string;
  }): Promise<Result<Anamnesis>>;
}

export const ISubmitAnamnesisUseCase = Symbol('ISubmitAnamnesisUseCase');
