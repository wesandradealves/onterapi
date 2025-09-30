import { Result } from '../../../../shared/types/result.type';
import {
  TherapeuticPlanData,
  TherapeuticPlanRecommendation,
  TherapeuticPlanRiskFactor,
} from '../../../anamnesis/types/anamnesis.types';

export interface ISaveTherapeuticPlanUseCase {
  execute(params: {
    tenantId: string;
    anamnesisId: string;
    clinicalReasoning?: string;
    summary?: string;
    therapeuticPlan?: Record<string, unknown>;
    riskFactors?: TherapeuticPlanRiskFactor[];
    recommendations?: TherapeuticPlanRecommendation[];
    confidence?: number;
    reviewRequired?: boolean;
    termsAccepted: boolean;
    generatedAt: Date;
    requesterId: string;
    requesterRole: string;
  }): Promise<Result<TherapeuticPlanData>>;
  executeOrThrow(params: {
    tenantId: string;
    anamnesisId: string;
    clinicalReasoning?: string;
    summary?: string;
    therapeuticPlan?: Record<string, unknown>;
    riskFactors?: TherapeuticPlanRiskFactor[];
    recommendations?: TherapeuticPlanRecommendation[];
    confidence?: number;
    reviewRequired?: boolean;
    termsAccepted: boolean;
    generatedAt: Date;
    requesterId: string;
    requesterRole: string;
  }): Promise<TherapeuticPlanData>;
}

export const ISaveTherapeuticPlanUseCase = Symbol('ISaveTherapeuticPlanUseCase');
