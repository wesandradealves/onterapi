import {
  Anamnesis,
  AnamnesisAttachment,
  AnamnesisListItem,
  AnamnesisStep,
  TherapeuticPlanData,
} from '../../../domain/anamnesis/types/anamnesis.types';
import {
  AnamnesisAttachmentDto,
  AnamnesisDetailResponseDto,
  AnamnesisListItemDto,
  AnamnesisStepDto,
  TherapeuticPlanDto,
  TherapeuticPlanRecommendationDto,
  TherapeuticPlanRiskFactorDto,
} from '../dtos/anamnesis-response.dto';

const toIsoString = (value?: Date): string | undefined => (value ? value.toISOString() : undefined);

const cloneRecord = (value?: Record<string, unknown> | null): Record<string, unknown> => {
  if (!value) {
    return {};
  }
  return JSON.parse(JSON.stringify(value));
};

const mapStep = (step: AnamnesisStep): AnamnesisStepDto => ({
  id: step.id,
  stepNumber: step.stepNumber,
  key: step.key,
  payload: cloneRecord(step.payload as Record<string, unknown>),
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

const mapRecommendations = (
  recommendations?: TherapeuticPlanData['recommendations'],
): TherapeuticPlanRecommendationDto[] | undefined => {
  if (!recommendations) {
    return undefined;
  }
  return recommendations.map((item) => ({
    id: item.id,
    description: item.description,
    priority: item.priority,
  }));
};

const mapRiskFactors = (
  riskFactors?: TherapeuticPlanData['riskFactors'],
): TherapeuticPlanRiskFactorDto[] | undefined => {
  if (!riskFactors) {
    return undefined;
  }
  return riskFactors.map((item) => ({
    id: item.id,
    description: item.description,
    severity: item.severity,
  }));
};

const mapPlan = (plan: TherapeuticPlanData): TherapeuticPlanDto => ({
  id: plan.id,
  anamnesisId: plan.anamnesisId,
  clinicalReasoning: plan.clinicalReasoning,
  summary: plan.summary,
  therapeuticPlan: cloneRecord(plan.therapeuticPlan as Record<string, unknown>),
  riskFactors: mapRiskFactors(plan.riskFactors),
  recommendations: mapRecommendations(plan.recommendations),
  confidence: plan.confidence,
  reviewRequired: plan.reviewRequired,
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

  static plan(plan: TherapeuticPlanData): TherapeuticPlanDto {
    return mapPlan(plan);
  }

  static attachment(attachment: AnamnesisAttachment): AnamnesisAttachmentDto {
    return mapAttachment(attachment);
  }
}
