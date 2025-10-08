import { clonePlain } from '../../../../shared/utils/clone.util';
import { isoStringOrNow } from '../../../../shared/utils/date.util';

import {
  Anamnesis,
  AnamnesisAttachment,
  AnamnesisHistoryData,
  AnamnesisHistoryEntry,
  AnamnesisHistoryStep,
  AnamnesisListItem,
  AnamnesisMetricsSnapshot,
  AnamnesisStep,
  AnamnesisStepTemplate,
  TherapeuticPlanData,
} from '../../../../domain/anamnesis/types/anamnesis.types';

import {
  AnamnesisAttachmentDto,
  AnamnesisDetailResponseDto,
  AnamnesisHistoryEntryDto,
  AnamnesisHistoryPrefillDto,
  AnamnesisHistoryResponseDto,
  AnamnesisHistoryStepDto,
  AnamnesisListItemDto,
  AnamnesisMetricsFeedbackDto,
  AnamnesisMetricsSnapshotDto,
  AnamnesisStepDto,
  AnamnesisStepTemplateDto,
  TherapeuticPlanAcceptanceDto,
  TherapeuticPlanDto,
  TherapeuticPlanRecommendationDto,
  TherapeuticPlanRiskFactorDto,
} from '../dtos/anamnesis-response.dto';

const toIsoString = (value?: Date): string | undefined => (value ? value.toISOString() : undefined);

const cloneRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object') {
    return {};
  }

  try {
    return clonePlain(value) as Record<string, unknown>;
  } catch {
    return {};
  }
};

const mapStep = (step: AnamnesisStep): AnamnesisStepDto => ({
  id: step.id,

  stepNumber: step.stepNumber,

  key: step.key,

  payload: cloneRecord(step.payload),

  completed: step.completed,

  hasErrors: step.hasErrors,

  validationScore: step.validationScore,

  updatedAt: isoStringOrNow(step.updatedAt),

  createdAt: isoStringOrNow(step.createdAt),
});

const mapAttachment = (attachment: AnamnesisAttachment): AnamnesisAttachmentDto => ({
  id: attachment.id,

  stepNumber: attachment.stepNumber,

  fileName: attachment.fileName,

  mimeType: attachment.mimeType,

  size: attachment.size,

  storagePath: attachment.storagePath,

  uploadedBy: attachment.uploadedBy,

  uploadedAt: isoStringOrNow(attachment.uploadedAt),
});

const mapTemplate = (template: AnamnesisStepTemplate): AnamnesisStepTemplateDto => ({
  id: template.id,

  key: template.key,

  title: template.title,

  description: template.description,

  version: template.version,

  schema: cloneRecord(template.schema),

  specialty: template.specialty ?? undefined,

  isActive: template.isActive,

  tenantId: template.tenantId ?? undefined,

  createdAt: isoStringOrNow(template.createdAt),

  updatedAt: isoStringOrNow(template.updatedAt),
});

const mapRecommendations = (
  recommendations?: TherapeuticPlanData['recommendations'],
): TherapeuticPlanRecommendationDto[] | undefined => {
  if (!Array.isArray(recommendations)) {
    return undefined;
  }

  return recommendations.map(
    (item): TherapeuticPlanRecommendationDto => ({
      id: item.id,

      description: item.description,

      priority: item.priority,
    }),
  );
};

const mapAcceptances = (
  acceptances?: TherapeuticPlanData['acceptances'],
): TherapeuticPlanAcceptanceDto[] | undefined => {
  if (!Array.isArray(acceptances) || acceptances.length === 0) {
    return undefined;
  }

  return acceptances.map((acceptance) => ({
    id: acceptance.id,

    professionalId: acceptance.professionalId,

    acceptedAt: isoStringOrNow(acceptance.acceptedAt),

    termsVersion: acceptance.termsVersion,

    termsTextSnapshot: acceptance.termsTextSnapshot,

    acceptedIp: acceptance.acceptedIp ?? undefined,

    acceptedUserAgent: acceptance.acceptedUserAgent ?? undefined,
  }));
};

const mapRiskFactors = (
  riskFactors?: TherapeuticPlanData['riskFactors'],
): TherapeuticPlanRiskFactorDto[] | undefined => {
  if (!Array.isArray(riskFactors)) {
    return undefined;
  }

  return riskFactors.map(
    (item): TherapeuticPlanRiskFactorDto => ({
      id: item.id,

      description: item.description,

      severity: item.severity,
    }),
  );
};

const mapHistoryStep = (step: AnamnesisHistoryStep): AnamnesisHistoryStepDto => ({
  stepNumber: step.stepNumber,

  key: step.key,

  payload: cloneRecord(step.payload),

  completed: step.completed,

  hasErrors: step.hasErrors,

  validationScore: step.validationScore,

  updatedAt: isoStringOrNow(step.updatedAt),
});

const mapHistoryEntry = (entry: AnamnesisHistoryEntry): AnamnesisHistoryEntryDto => ({
  id: entry.id,

  consultationId: entry.consultationId,

  professionalId: entry.professionalId,

  status: entry.status,

  completionRate: entry.completionRate,

  submittedAt: toIsoString(entry.submittedAt),

  updatedAt: isoStringOrNow(entry.updatedAt),

  steps: entry.steps.map(mapHistoryStep),

  attachments: entry.attachments.map(mapAttachment),

  latestPlan: entry.latestPlan ? mapPlan(entry.latestPlan) : null,
});

const mapHistoryPrefill = (
  prefill: AnamnesisHistoryData['prefill'],
): AnamnesisHistoryPrefillDto => ({
  steps: Object.fromEntries(
    Object.entries(prefill.steps).map(([key, value]) => [key, cloneRecord(value)]),
  ),

  attachments: prefill.attachments.map(mapAttachment),

  sourceAnamnesisId: prefill.sourceAnamnesisId,

  updatedAt: toIsoString(prefill.updatedAt),
});

const mapPlan = (plan: TherapeuticPlanData): TherapeuticPlanDto => ({
  id: plan.id,

  anamnesisId: plan.anamnesisId,

  analysisId: plan.analysisId ?? undefined,

  clinicalReasoning: plan.clinicalReasoning,

  summary: plan.summary,

  therapeuticPlan: cloneRecord(plan.therapeuticPlan),

  riskFactors: mapRiskFactors(plan.riskFactors),

  recommendations: mapRecommendations(plan.recommendations),

  planText: plan.planText ?? undefined,

  reasoningText: plan.reasoningText ?? undefined,

  evidenceMap: Array.isArray(plan.evidenceMap)
    ? plan.evidenceMap.map((item) => cloneRecord(item))
    : undefined,

  confidence: plan.confidence,

  status: plan.status ?? 'generated',

  reviewRequired: plan.reviewRequired ?? false,

  termsAccepted: plan.termsAccepted ?? false,

  approvalStatus: plan.approvalStatus,

  liked: plan.liked,

  feedbackComment: plan.feedbackComment,

  feedbackGivenBy: plan.feedbackGivenBy,

  feedbackGivenAt: toIsoString(plan.feedbackGivenAt),

  acceptedAt: plan.acceptedAt ? toIsoString(plan.acceptedAt) : undefined,

  acceptedBy: plan.acceptedBy ?? undefined,

  termsVersion: plan.termsVersion ?? undefined,

  generatedAt: isoStringOrNow(plan.generatedAt),

  createdAt: isoStringOrNow(plan.createdAt),

  updatedAt: isoStringOrNow(plan.updatedAt),

  acceptances: mapAcceptances(plan.acceptances),
});

export class AnamnesisPresenter {
  static detail(entity: Anamnesis): AnamnesisDetailResponseDto {
    return {
      id: entity.id,

      consultationId: entity.consultationId,

      patientId: entity.patientId,

      professionalId: entity.professionalId,

      tenantId: entity.tenantId,

      status: entity.status,

      totalSteps: entity.totalSteps,

      currentStep: entity.currentStep,

      completionRate: entity.completionRate,

      isDraft: entity.isDraft,

      lastAutoSavedAt: toIsoString(entity.lastAutoSavedAt),

      submittedAt: toIsoString(entity.submittedAt),

      completedAt: toIsoString(entity.completedAt),

      createdAt: isoStringOrNow(entity.createdAt),

      updatedAt: isoStringOrNow(entity.updatedAt),

      deletedAt: entity.deletedAt ? toIsoString(entity.deletedAt) : null,

      deletedBy: entity.deletedBy ?? undefined,

      deletedReason: entity.deletedReason ?? undefined,

      steps: entity.steps ? entity.steps.map(mapStep) : undefined,

      latestPlan: entity.latestPlan ? mapPlan(entity.latestPlan) : null,

      attachments: entity.attachments ? entity.attachments.map(mapAttachment) : undefined,
    };
  }

  static listItem(item: AnamnesisListItem): AnamnesisListItemDto {
    return {
      id: item.id,

      consultationId: item.consultationId,

      patientId: item.patientId,

      professionalId: item.professionalId,

      status: item.status,

      completionRate: item.completionRate,

      submittedAt: toIsoString(item.submittedAt),

      updatedAt: isoStringOrNow(item.updatedAt),
    };
  }

  static list(items: AnamnesisListItem[]): AnamnesisListItemDto[] {
    return items.map((item) => this.listItem(item));
  }

  static history(history: AnamnesisHistoryData): AnamnesisHistoryResponseDto {
    return {
      patientId: history.patientId,

      entries: history.entries.map(mapHistoryEntry),

      prefill: mapHistoryPrefill(history.prefill),
    };
  }

  static templates(templates: AnamnesisStepTemplate[]): AnamnesisStepTemplateDto[] {
    return templates.map(mapTemplate);
  }

  static metrics(snapshot: AnamnesisMetricsSnapshot): AnamnesisMetricsSnapshotDto {
    const feedback: AnamnesisMetricsFeedbackDto = {
      total: snapshot.feedback.total,
      approvals: snapshot.feedback.approvals,
      modifications: snapshot.feedback.modifications,
      rejections: snapshot.feedback.rejections,
      likes: snapshot.feedback.likes,
      dislikes: snapshot.feedback.dislikes,
    };

    return {
      stepsSaved: snapshot.stepsSaved,
      autoSaves: snapshot.autoSaves,
      completedSteps: snapshot.completedSteps,
      averageStepCompletionRate: snapshot.averageStepCompletionRate,
      submissions: snapshot.submissions,
      averageSubmissionCompletionRate: snapshot.averageSubmissionCompletionRate,
      aiCompleted: snapshot.aiCompleted,
      aiFailed: snapshot.aiFailed,
      averageAIConfidence: snapshot.averageAIConfidence,
      tokensInputTotal: snapshot.tokensInputTotal,
      tokensOutputTotal: snapshot.tokensOutputTotal,
      averageAILatencyMs: snapshot.averageAILatencyMs,
      maxAILatencyMs: snapshot.maxAILatencyMs,
      totalAICost: snapshot.totalAICost,
      feedback,
      lastUpdatedAt: snapshot.lastUpdatedAt ? snapshot.lastUpdatedAt.toISOString() : null,
    };
  }

  static plan(plan: TherapeuticPlanData): TherapeuticPlanDto {
    return mapPlan(plan);
  }

  static attachment(attachment: AnamnesisAttachment): AnamnesisAttachmentDto {
    return mapAttachment(attachment);
  }
}
