import { Result } from '../../../../shared/types/result.type';
import { Anamnesis } from '../../../anamnesis/types/anamnesis.types';

export interface IGetAnamnesisUseCase {
  execute(params: {
    tenantId: string;
    anamnesisId: string;
    includeSteps?: boolean;
    includeLatestPlan?: boolean;
    includeAttachments?: boolean;
    requesterId: string;
    requesterRole: string;
  }): Promise<Result<Anamnesis>>;
  executeOrThrow(params: {
    tenantId: string;
    anamnesisId: string;
    includeSteps?: boolean;
    includeLatestPlan?: boolean;
    includeAttachments?: boolean;
    requesterId: string;
    requesterRole: string;
  }): Promise<Anamnesis>;
}

export const IGetAnamnesisUseCase = Symbol('IGetAnamnesisUseCase');
