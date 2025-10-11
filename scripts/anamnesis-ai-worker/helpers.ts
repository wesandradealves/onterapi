import { randomUUID } from 'node:crypto';

import {
  AnamnesisCompactSummary,
  AnamnesisStatus,
  AnamnesisStepKey,
  TherapeuticPlanRecommendation,
  TherapeuticPlanRiskFactor,
} from '../../src/domain/anamnesis/types/anamnesis.types';
import {
  deriveRecommendationsFromPlanText,
  deriveRiskFactorsFromEvidence,
} from '../../src/shared/utils/therapeutic-plan.util';

function coerceString(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return fallback;
}

export function normalizeCompact(input: Record<string, unknown>): AnamnesisCompactSummary {
  const summary = input as Partial<AnamnesisCompactSummary>;

  const id = coerceString(summary.id, randomUUID());
  const tenantId = coerceString(summary.tenantId, 'unknown-tenant');
  const patientId = coerceString(summary.patientId, 'unknown-patient');
  const consultationId = coerceString(summary.consultationId, 'unknown-consultation');
  const professionalId = coerceString(summary.professionalId, 'unknown-professional');
  const status = (summary.status as AnamnesisStatus | undefined) ?? 'submitted';

  return {
    id,
    tenantId,
    consultationId,
    patientId,
    professionalId,
    status,
    completionRate: Number(summary.completionRate ?? 0),
    submittedAt: summary.submittedAt ? new Date(summary.submittedAt) : new Date(),
    steps: Array.isArray(summary.steps)
      ? summary.steps.map((step) => ({
          key: String((step as { key: string }).key ?? 'unknown-step') as AnamnesisStepKey,
          completed: Boolean((step as { completed?: boolean }).completed ?? true),
          payload: (step as { payload?: Record<string, unknown> }).payload ?? {},
        }))
      : [],
    attachments: Array.isArray(summary.attachments)
      ? summary.attachments.map((attachment) => ({
          id: coerceString((attachment as { id?: string }).id, randomUUID()),
          fileName: coerceString((attachment as { fileName?: string }).fileName, 'attachment'),
          stepNumber: Number((attachment as { stepNumber?: number }).stepNumber ?? 0),
        }))
      : [],
  };
}

export function buildRecommendations(planText: string): TherapeuticPlanRecommendation[] {
  return deriveRecommendationsFromPlanText(planText);
}

export function buildRiskFactors(evidenceMap: Array<Record<string, unknown>>): TherapeuticPlanRiskFactor[] {
  return deriveRiskFactorsFromEvidence(evidenceMap);
}

export function buildSummary(text: string, maxLength: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength - 1)}…`;
}
