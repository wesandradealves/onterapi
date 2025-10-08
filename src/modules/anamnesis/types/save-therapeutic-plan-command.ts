import { TherapeuticPlanData } from '../../../domain/anamnesis/types/anamnesis.types';

export interface SaveTherapeuticPlanCommand {
  tenantId: string;
  anamnesisId: string;
  analysisId?: string | null;
  clinicalReasoning?: string;
  summary?: string;
  therapeuticPlan?: Record<string, unknown>;
  riskFactors?: TherapeuticPlanData['riskFactors'];
  recommendations?: TherapeuticPlanData['recommendations'];
  planText?: string | null;
  reasoningText?: string | null;
  evidenceMap?: Array<Record<string, unknown>> | null;
  confidence?: number;
  reviewRequired?: boolean;
  termsVersion: string;
  termsTextSnapshot: string;
  acceptanceIp?: string;
  acceptanceUserAgent?: string;
  termsAccepted: boolean;
  generatedAt: Date;
  requesterId: string;
  requesterRole: string;
}
