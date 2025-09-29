import { Result } from '../../../../shared/types/result.type';
import { Anamnesis, AnamnesisStepKey } from '../../../anamnesis/types/anamnesis.types';

export interface IAutoSaveAnamnesisUseCase {
  execute(params: {
    tenantId: string;
    anamnesisId: string;
    stepNumber: number;
    key: AnamnesisStepKey;
    payload: Record<string, unknown>;
    hasErrors?: boolean;
    validationScore?: number;
    autoSavedAt?: Date;
    requesterId: string;
    requesterRole: string;
  }): Promise<Result<Anamnesis>>;
  executeOrThrow(params: {
    tenantId: string;
    anamnesisId: string;
    stepNumber: number;
    key: AnamnesisStepKey;
    payload: Record<string, unknown>;
    hasErrors?: boolean;
    validationScore?: number;
    autoSavedAt?: Date;
    requesterId: string;
    requesterRole: string;
  }): Promise<Anamnesis>;
}

export const IAutoSaveAnamnesisUseCase = Symbol('IAutoSaveAnamnesisUseCase');
