import { randomUUID } from 'node:crypto';

import {
  TherapeuticPlanRecommendation,
  TherapeuticPlanRiskFactor,
} from '../../domain/anamnesis/types/anamnesis.types';

const RECOMMENDATION_LIMIT = 8;
const RISK_FACTOR_LIMIT = 8;
const EVIDENCE_LIMIT_PER_ENTRY = 5;

const removeLeadingMarker = (line: string): string => line.replace(/^[0-9]+[).\-\s]*/, '').trim();

export function deriveRecommendationsFromPlanText(
  planText: string,
): TherapeuticPlanRecommendation[] {
  if (!planText.trim()) {
    return [];
  }

  return planText
    .split(/\n+/)
    .map((line) => removeLeadingMarker(line))
    .filter((line) => line.length > 0)
    .slice(0, RECOMMENDATION_LIMIT)
    .map((description) => ({
      id: randomUUID(),
      description,
      priority: description.toLowerCase().includes('urgente') ? 'high' : 'medium',
    }));
}

export function deriveRiskFactorsFromEvidence(
  evidenceMap: Array<Record<string, unknown>>,
): TherapeuticPlanRiskFactor[] {
  const bucket = new Map<string, TherapeuticPlanRiskFactor>();

  evidenceMap.forEach((entry) => {
    const evidences = Array.isArray(entry.evidence) ? (entry.evidence as unknown[]) : [];
    evidences
      .map((value) => String(value ?? '').trim())
      .filter((value) => value.length > 0)
      .slice(0, EVIDENCE_LIMIT_PER_ENTRY)
      .forEach((value) => {
        if (bucket.size >= RISK_FACTOR_LIMIT) {
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
