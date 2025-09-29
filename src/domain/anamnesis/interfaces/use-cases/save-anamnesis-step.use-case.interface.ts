import { Result } from '../../../../shared/types/result.type';
import { Anamnesis, AnamnesisStepKey } from '../../../anamnesis/types/anamnesis.types';

export interface ISaveAnamnesisStepUseCase {
  execute(params: {
    tenantId: string;
    anamnesisId: string;
    stepNumber: number;
    key: AnamnesisStepKey;
    payload: Record<string, unknown>;
    completed?: boolean;
    hasErrors?: boolean;
    validationScore?: number;
    requesterId: string;
    requesterRole: string;
  }): Promise<Result<Anamnesis>>;
  executeOrThrow(params: {
    tenantId: string;
    anamnesisId: string;
    stepNumber: number;
    key: AnamnesisStepKey;
    payload: Record<string, unknown>;
    completed?: boolean;
    hasErrors?: boolean;
    validationScore?: number;
    requesterId: string;
    requesterRole: string;
  }): Promise<Anamnesis>;
}

export const ISaveAnamnesisStepUseCase = Symbol('ISaveAnamnesisStepUseCase');
