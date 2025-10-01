import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import {
  AnamnesisAIRequestPayload,
  AnamnesisCompactSummary,
  AnamnesisStepKey,
  TherapeuticPlanRecommendation,
  TherapeuticPlanRiskFactor,
} from '../../../domain/anamnesis/types/anamnesis.types';

export interface LocalAIPlanResult {
  planText: string;
  reasoningText: string;
  summary: string;
  recommendations: TherapeuticPlanRecommendation[];
  riskFactors: TherapeuticPlanRiskFactor[];
  evidenceMap: Array<{
    recommendation: string;
    evidence: string[];
    confidence: number;
  }>;
  confidence: number;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  model: string;
}

interface GenerateParams {
  request: AnamnesisAIRequestPayload;
  compact: AnamnesisCompactSummary;
  rollupSummary: string;
}

const MAX_EVIDENCE = 3;

@Injectable()
export class LocalAIPlanGeneratorService {
  generate(params: GenerateParams): LocalAIPlanResult {
    const { request, compact, rollupSummary } = params;
    const chiefComplaint = this.extractChiefComplaint(request);
    const medications = this.extractMedicationHistory(request);
    const relevantFindings = this.extractRelevantFindings(request);
    const summaryPieces: string[] = [];

    if (chiefComplaint) {
      summaryPieces.push(`Queixa principal: ${chiefComplaint}`);
    }

    if (relevantFindings.length) {
      summaryPieces.push(`Achados: ${relevantFindings.join('; ')}`);
    }

    if (medications.length) {
      summaryPieces.push(`Medicacoes em uso: ${medications.join('; ')}`);
    }

    const recommendations = this.buildRecommendations(summaryPieces, rollupSummary);
    const planText = this.composePlanText(recommendations);
    const reasoningText = this.composeReasoningText(recommendations, rollupSummary);
    const evidenceMap = this.composeEvidence(recommendations, summaryPieces, rollupSummary);
    const riskFactors = this.buildRiskFactors(relevantFindings);

    const rawInputLength = JSON.stringify(request).length + JSON.stringify(compact).length;
    const rawOutputLength = planText.length + reasoningText.length;

    return {
      planText,
      reasoningText,
      summary: summaryPieces.join(' | ') || 'Conduta baseada nos relatos atuais.',
      recommendations,
      riskFactors,
      evidenceMap,
      confidence: 0.62,
      tokensIn: Math.max(50, Math.ceil(rawInputLength / 4)),
      tokensOut: Math.max(120, Math.ceil(rawOutputLength / 4)),
      latencyMs: 1200 + compact.steps.length * 120,
      model: 'local-rule-engine-v1',
    };
  }

  private extractChiefComplaint(request: AnamnesisAIRequestPayload): string | undefined {
    const node = this.getStepPayload(request, 'chiefComplaint');
    if (!node || typeof node !== 'object') {
      return undefined;
    }
    const description = this.toSentence((node as Record<string, unknown>)['description']);
    const duration = this.toSentence((node as Record<string, unknown>)['duration']);
    if (description && duration) {
      return `${description} (h� ${duration})`;
    }
    return description ?? duration ?? undefined;
  }

  private extractMedicationHistory(request: AnamnesisAIRequestPayload): string[] {
    const node = this.getStepPayload(request, 'medications');
    if (!node || typeof node !== 'object') {
      return [];
    }
    const list = (node as Record<string, unknown>)['current'] as unknown;
    if (Array.isArray(list)) {
      return list
        .map((entry) => this.toSentence(entry))
        .filter((entry): entry is string => Boolean(entry));
    }
    return [];
  }

  private extractRelevantFindings(request: AnamnesisAIRequestPayload): string[] {
    const node = this.getStepPayload(request, 'physicalExam') as
      | Record<string, unknown>
      | undefined;
    const findings: string[] = [];

    if (!node) {
      return findings;
    }

    const observations = node['observations'];
    if (Array.isArray(observations)) {
      observations
        .map((entry) => this.toSentence(entry))
        .filter((entry): entry is string => Boolean(entry))
        .forEach((entry) => findings.push(entry));
    }

    const anthropometry = node['anthropometry'] as Record<string, unknown> | undefined;
    if (anthropometry) {
      const weight = this.toSentence(anthropometry['weightKg'] ?? anthropometry['weight']);
      const height = this.toSentence(anthropometry['heightCm'] ?? anthropometry['height']);
      const bmi = this.toSentence(anthropometry['bmi']);
      if (weight) {
        findings.push(`Peso ${weight}`);
      }
      if (height) {
        findings.push(`Altura ${height}`);
      }
      if (bmi) {
        findings.push(`IMC ${bmi}`);
      }
    }

    return findings.slice(0, MAX_EVIDENCE);
  }

  private buildRecommendations(
    details: string[],
    rollupSummary: string,
  ): TherapeuticPlanRecommendation[] {
    const recommendations: TherapeuticPlanRecommendation[] = [];
    if (details.length) {
      recommendations.push({
        id: uuidv4(),
        description: `Reavaliar achados relatorios: ${details.join('; ')}`,
        priority: 'medium',
      });
    }

    if (rollupSummary.trim().length > 0) {
      recommendations.push({
        id: uuidv4(),
        description: 'Comparar evolucao com resumo acumulado do paciente.',
        priority: 'low',
      });
    }

    if (!recommendations.length) {
      recommendations.push({
        id: uuidv4(),
        description: 'Manter acompanhamento clinico e revisar habitos saudaveis.',
        priority: 'low',
      });
    }

    return recommendations;
  }

  private buildRiskFactors(findings: string[]): TherapeuticPlanRiskFactor[] {
    if (!findings.length) {
      return [];
    }

    return findings.slice(0, MAX_EVIDENCE).map((finding) => ({
      id: uuidv4(),
      description: finding,
      severity: 'medium',
    }));
  }

  private composePlanText(recommendations: TherapeuticPlanRecommendation[]): string {
    return recommendations.map((rec, index) => `${index + 1}) ${rec.description}`).join('\n');
  }

  private composeReasoningText(
    recommendations: TherapeuticPlanRecommendation[],
    rollupSummary: string,
  ): string {
    const reasoning: string[] = recommendations.map((rec) => `- ${rec.description}.`);
    if (rollupSummary.trim().length > 0) {
      reasoning.push('- Considerar tendencias descritas no resumo acumulado.');
    }
    reasoning.push('- Recomendar revisita em caso de novos sinais ou agravamento dos sintomas.');
    return reasoning.join('\n');
  }

  private composeEvidence(
    recommendations: TherapeuticPlanRecommendation[],
    details: string[],
    rollupSummary: string,
  ): Array<{ recommendation: string; evidence: string[]; confidence: number }> {
    return recommendations.map((rec) => {
      const evidence: string[] = [];
      evidence.push(...details.slice(0, MAX_EVIDENCE));
      if (rollupSummary.trim().length > 0) {
        evidence.push('Resumo acumulado do paciente');
      }
      return {
        recommendation: rec.description,
        evidence,
        confidence: 0.6,
      };
    });
  }

  private getStepPayload(
    request: AnamnesisAIRequestPayload,
    key: AnamnesisStepKey | string,
  ): unknown {
    return request.steps[key as AnamnesisStepKey];
  }

  private toSentence(value: unknown): string | undefined {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length ? trimmed : undefined;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value.toString();
    }
    if (Array.isArray(value)) {
      return value
        .map((entry) => this.toSentence(entry))
        .filter((entry): entry is string => Boolean(entry))
        .join(', ');
    }
    if (value && typeof value === 'object') {
      return JSON.stringify(value);
    }
    return undefined;
  }
}
