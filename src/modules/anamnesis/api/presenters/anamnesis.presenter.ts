import {
  Anamnesis,
  AnamnesisAttachment,
  AnamnesisHistoryData,
  AnamnesisHistoryEntry,
  AnamnesisHistoryStep,
  AnamnesisListItem,
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
  AnamnesisStepDto,
  AnamnesisStepTemplateDto,
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
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
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
  updatedAt: toIsoString(step.updatedAt) ?? new Date().toISOString(),
  createdAt: toIsoString(step.createdAt) ?? new Date().toISOString(),
});

const mapAttachment = (attachment: AnamnesisAttachment): AnamnesisAttachmentDto => ({
  id: attachment.id,
  stepNumber: attachment.stepNumber,
  fileName: attachment.fileName,
  mimeType: attachment.mimeType,
  size: attachment.size,
  storagePath: attachment.storagePath,
  uploadedBy: attachment.uploadedBy,
  uploadedAt: toIsoString(attachment.uploadedAt) ?? new Date().toISOString(),
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
  createdAt: toIsoString(template.createdAt) ?? new Date().toISOString(),
  updatedAt: toIsoString(template.updatedAt) ?? new Date().toISOString(),
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
  updatedAt: toIsoString(step.updatedAt) ?? new Date().toISOString(),
});

const mapHistoryEntry = (entry: AnamnesisHistoryEntry): AnamnesisHistoryEntryDto => ({
  id: entry.id,
  consultationId: entry.consultationId,
  professionalId: entry.professionalId,
  status: entry.status,
  completionRate: entry.completionRate,
  submittedAt: toIsoString(entry.submittedAt),
  updatedAt: toIsoString(entry.updatedAt) ?? new Date().toISOString(),
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
  clinicalReasoning: plan.clinicalReasoning,
  summary: plan.summary,
  therapeuticPlan: cloneRecord(plan.therapeuticPlan),
  riskFactors: mapRiskFactors(plan.riskFactors),
  recommendations: mapRecommendations(plan.recommendations),
  confidence: plan.confidence,
  reviewRequired: plan.reviewRequired ?? false,
  approvalStatus: plan.approvalStatus,
  liked: plan.liked,
  feedbackComment: plan.feedbackComment,
  feedbackGivenBy: plan.feedbackGivenBy,
  feedbackGivenAt: toIsoString(plan.feedbackGivenAt),
  generatedAt: toIsoString(plan.generatedAt) ?? new Date().toISOString(),
  createdAt: toIsoString(plan.createdAt) ?? new Date().toISOString(),
  updatedAt: toIsoString(plan.updatedAt) ?? new Date().toISOString(),
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
      createdAt: toIsoString(entity.createdAt) ?? new Date().toISOString(),
      updatedAt: toIsoString(entity.updatedAt) ?? new Date().toISOString(),
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
      updatedAt: toIsoString(item.updatedAt) ?? new Date().toISOString(),
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

  static plan(plan: TherapeuticPlanData): TherapeuticPlanDto {
    return mapPlan(plan);
  }

  static attachment(attachment: AnamnesisAttachment): AnamnesisAttachmentDto {
    return mapAttachment(attachment);
  }
}
