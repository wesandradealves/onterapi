import { Injectable } from '@nestjs/common';

import {
  Anamnesis,
  PatientAnamnesisRollup,
  TherapeuticPlanData,
  UpsertPatientAnamnesisRollupInput,
} from '../../../domain/anamnesis/types/anamnesis.types';

interface BuildRollupParams {
  tenantId: string;
  patientId: string;
  anamnesis: Anamnesis;
  plan: TherapeuticPlanData;
  acceptedBy: string;
  acceptedAt: Date;
  previousRollup?: PatientAnamnesisRollup | null;
}

@Injectable()
export class PatientAnamnesisRollupService {
  buildSummary(params: BuildRollupParams): UpsertPatientAnamnesisRollupInput {
    const summaryVersion = (params.previousRollup?.summaryVersion ?? 0) + 1;
    const summaryText = this.buildPayload(params, summaryVersion);

    return {
      tenantId: params.tenantId,
      patientId: params.patientId,
      summaryText,
      summaryVersion,
      lastAnamnesisId: params.anamnesis.id,
      updatedBy: params.acceptedBy,
    };
  }

  private buildPayload(params: BuildRollupParams, summaryVersion: number): string {
    const segments: string[] = [];
    const joinSeparator = '\n\n';
    const { anamnesis, plan, previousRollup } = params;

    segments.push(
      `Resumo consolidado v${summaryVersion} (aceito em ${params.acceptedAt.toISOString()} pelo profissional ${params.acceptedBy})`,
    );

    const baseInfo = [`Anamnese: ${anamnesis.id}`];
    if (anamnesis.consultationId) {
      baseInfo.push(`Consulta: ${anamnesis.consultationId}`);
    }
    segments.push(baseInfo.join(' | '));

    if (plan.summary) {
      segments.push(`Resumo do plano: ${plan.summary}`);
    } else if (plan.planText) {
      segments.push(`Plano terapAautico: ${plan.planText}`);
    }

    const reasoning = plan.reasoningText ?? plan.clinicalReasoning;
    if (reasoning) {
      segments.push(`RaciocA nio clA nico: ${reasoning}`);
    }

    if (Array.isArray(plan.recommendations) && plan.recommendations.length > 0) {
      const recommendations = plan.recommendations
        .map((item) => {
          const priority = item.priority ? ` (prioridade: ${item.priority})` : '';
          return `${item.description}${priority}`;
        })
        .join('; ');
      segments.push(`RecomendaASAues principais: ${recommendations}`);
    }

    if (Array.isArray(plan.riskFactors) && plan.riskFactors.length > 0) {
      const risks = plan.riskFactors
        .map((item) => {
          const severity = item.severity ? ` (gravidade: ${item.severity})` : '';
          return `${item.description}${severity}`;
        })
        .join('; ');
      segments.push(`Fatores de risco monitorados: ${risks}`);
    }

    if (previousRollup?.summaryText) {
      const previousPreview =
        previousRollup.summaryText.length > 500
          ? `${previousRollup.summaryText.slice(0, 497)}...`
          : previousRollup.summaryText;
      const previousVersion = previousRollup.summaryVersion ?? 'anterior';
      segments.push(`Resumo anterior (v${previousVersion}): ${previousPreview}`);
    }

    return segments.filter(Boolean).join(joinSeparator).trim();
  }
}
