import { Result } from '../../../../shared/types/result.type';
import {
  SaveTherapeuticPlanInput,
  TherapeuticPlanData,
} from '../../../anamnesis/types/anamnesis.types';

export type SaveTherapeuticPlanUseCaseParams = SaveTherapeuticPlanInput & {
  requesterId: string;
  requesterRole: string;
};

export interface ISaveTherapeuticPlanUseCase {
  execute(params: SaveTherapeuticPlanUseCaseParams): Promise<Result<TherapeuticPlanData>>;
  executeOrThrow(params: SaveTherapeuticPlanUseCaseParams): Promise<TherapeuticPlanData>;
}

export const ISaveTherapeuticPlanUseCase = Symbol('ISaveTherapeuticPlanUseCase');
