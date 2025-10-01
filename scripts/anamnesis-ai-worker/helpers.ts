import { randomUUID } from 'node:crypto';

import {
  AnamnesisCompactSummary,
  AnamnesisStatus,
  AnamnesisStepKey,
  TherapeuticPlanRecommendation,
  TherapeuticPlanRiskFactor,
} from '../../src/domain/anamnesis/types/anamnesis.types';

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
  return planText
    .split(/\n+/)
    .map((line) => line.replace(/^[0-9]+[).\-\s]*/, '').trim())
    .filter((line) => line.length > 0)
    .slice(0, 8)
    .map((description) => ({
      id: randomUUID(),
      description,
      priority: description.toLowerCase().includes('urgente') ? 'high' : 'medium',
    }));
}

export function buildRiskFactors(evidenceMap: Array<Record<string, unknown>>): TherapeuticPlanRiskFactor[] {
  const bucket = new Map<string, TherapeuticPlanRiskFactor>();
  evidenceMap.forEach((entry) => {
    const evidences = Array.isArray(entry.evidence) ? (entry.evidence as unknown[]) : [];
    evidences
      .map((value) => String(value ?? '').trim())
      .filter((value) => value.length > 0)
      .slice(0, 5)
      .forEach((value) => {
        if (bucket.size >= 8) {
          return;
        }
        if (!bucket.has(value)) {
          bucket.set(value, {
            id: randomUUID(),
            description: value,
            severity: value.toLowerCase().includes('grave') ? 'high' : 'medium',
          });
        }
      });
  });
  return Array.from(bucket.values());
}

export function buildSummary(text: string, maxLength: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength - 1)}…`;
}
