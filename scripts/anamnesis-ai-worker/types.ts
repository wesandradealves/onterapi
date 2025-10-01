import {
  AnamnesisAIRequestPayload,
  AnamnesisCompactSummary,
  TherapeuticPlanRecommendation,
  TherapeuticPlanRiskFactor,
} from '../../src/domain/anamnesis/types/anamnesis.types';

export interface AiWorkerRequestBody {
  analysisId: string;
  anamnesisId: string;
  tenantId: string;
  promptVersion: string;
  systemPrompt: string;
  userPrompt: string;
  payload: AnamnesisAIRequestPayload;
  compact: Record<string, unknown>;
  rollupSummary: string;
  metadata?: Record<string, unknown>;
}

export interface ProviderSuccessResult {
  status: 'completed';
  planText: string;
  reasoningText: string;
  summary: string;
  recommendations: TherapeuticPlanRecommendation[];
  riskFactors: TherapeuticPlanRiskFactor[];
  evidenceMap: Array<Record<string, unknown>>;
  confidence: number;
  tokensInput?: number;
  tokensOutput?: number;
  latencyMs: number;
  model?: string;
  therapeuticPlan: Record<string, unknown>;
  payload: Record<string, unknown>;
  rawResponse?: Record<string, unknown>;
}

export interface ProviderFailureResult {
  status: 'failed';
  errorMessage: string;
  tokensInput?: number;
  tokensOutput?: number;
  latencyMs: number;
  model?: string;
  payload?: Record<string, unknown>;
  rawResponse?: Record<string, unknown>;
}

export type ProviderResult = ProviderSuccessResult | ProviderFailureResult;

export interface ProviderContext {
  promptVersion: string;
  compact: AnamnesisCompactSummary;
  rolledSummary: string;
  payload: AnamnesisAIRequestPayload;
}
