import { Result } from '../../../../shared/types/result.type';
import { CancelAnamnesisInput } from '../../../anamnesis/types/anamnesis.types';

export interface ICancelAnamnesisUseCase {
  execute(params: CancelAnamnesisInput): Promise<Result<void>>;
  executeOrThrow(params: CancelAnamnesisInput): Promise<void>;
}

export const ICancelAnamnesisUseCase = Symbol('ICancelAnamnesisUseCase');
