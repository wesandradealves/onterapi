import { Result } from '../../../../shared/types/result.type';
import { TherapeuticPlanData } from '../../../anamnesis/types/anamnesis.types';

export interface ISavePlanFeedbackUseCase {
  execute(params: {
    tenantId: string;
    anamnesisId: string;
    approvalStatus: 'approved' | 'modified' | 'rejected';
    liked?: boolean;
    feedbackComment?: string;
    requesterId: string;
    requesterRole: string;
  }): Promise<Result<TherapeuticPlanData>>;
}

export const ISavePlanFeedbackUseCase = Symbol('ISavePlanFeedbackUseCase');
