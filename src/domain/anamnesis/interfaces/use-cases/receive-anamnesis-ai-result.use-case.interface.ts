import { Result } from '../../../../shared/types/result.type';
import {
  AnamnesisAIAnalysis,
  ReceiveAnamnesisAIResultInput,
} from '../../../anamnesis/types/anamnesis.types';

export interface IReceiveAnamnesisAIResultUseCase {
  execute(params: ReceiveAnamnesisAIResultInput): Promise<Result<AnamnesisAIAnalysis>>;
}

export const IReceiveAnamnesisAIResultUseCase = Symbol('IReceiveAnamnesisAIResultUseCase');
