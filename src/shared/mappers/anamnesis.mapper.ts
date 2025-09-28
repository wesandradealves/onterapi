import {
  Anamnesis,
  AnamnesisAIAnalysis,
  AnamnesisAttachment,
  AnamnesisStep,
  AnamnesisStepKey,
  AnamnesisStepTemplate,
  TherapeuticPlanData,
} from '../../domain/anamnesis/types/anamnesis.types';
import { AnamnesisEntity } from '../../infrastructure/anamnesis/entities/anamnesis.entity';
import { AnamnesisStepEntity } from '../../infrastructure/anamnesis/entities/anamnesis-step.entity';
import { AnamnesisTherapeuticPlanEntity } from '../../infrastructure/anamnesis/entities/anamnesis-therapeutic-plan.entity';
import { AnamnesisAttachmentEntity } from '../../infrastructure/anamnesis/entities/anamnesis-attachment.entity';
import { AnamnesisStepTemplateEntity } from '../../infrastructure/anamnesis/entities/anamnesis-step-template.entity';
import { AnamnesisAIAnalysisEntity } from '../../infrastructure/anamnesis/entities/anamnesis-ai-analysis.entity';

const toDate = (value?: Date | string | null): Date | undefined => {
  if (!value) {
    return undefined;
  }
  return value instanceof Date ? value : new Date(value);
};

const normalisePayload = (payload?: unknown): Record<string, unknown> => {
  if (!payload || typeof payload !== 'object') {
    return {};
  }

  try {
    return JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
  } catch {
    return {};
  }
};

const castJsonArray = <T>(value: unknown): T | undefined => {
  if (Array.isArray(value)) {
    return value as T;
  }
  return undefined;
};

export const mapStepTemplateEntityToDomain = (
  entity: AnamnesisStepTemplateEntity,
): AnamnesisStepTemplate => ({
  id: entity.id,
  key: entity.key as AnamnesisStepKey,
  title: entity.title,
  description: entity.description ?? undefined,
  version: entity.version,
  schema: normalisePayload(entity.schema),
  specialty: entity.specialty ?? undefined,
  tenantId: entity.tenantId ?? null,
  isActive: entity.isActive,
  createdAt: toDate(entity.createdAt) ?? new Date(),
  updatedAt: toDate(entity.updatedAt) ?? new Date(),
});

export const mapAIAnalysisEntityToDomain = (
  entity: AnamnesisAIAnalysisEntity,
): AnamnesisAIAnalysis => ({
  id: entity.id,
  anamnesisId: entity.anamnesisId,
  tenantId: entity.tenantId,
  status: entity.status as AnamnesisAIAnalysis['status'],
  payload: entity.payload ? normalisePayload(entity.payload) : undefined,
  clinicalReasoning: entity.clinicalReasoning ?? undefined,
  summary: entity.summary ?? undefined,
  riskFactors: castJsonArray<AnamnesisAIAnalysis['riskFactors']>(entity.riskFactors),
  recommendations: castJsonArray<AnamnesisAIAnalysis['recommendations']>(entity.recommendations),
  confidence: entity.confidence === null ? undefined : (entity.confidence ?? undefined),
  generatedAt: toDate(entity.generatedAt),
  respondedAt: toDate(entity.respondedAt),
  errorMessage: entity.errorMessage ?? undefined,
  createdAt: toDate(entity.createdAt) ?? new Date(),
  updatedAt: toDate(entity.updatedAt) ?? new Date(),
});

export const mapAnamnesisStepEntityToDomain = (entity: AnamnesisStepEntity): AnamnesisStep => ({
  id: entity.id,
  anamnesisId: entity.anamnesisId,
  stepNumber: entity.stepNumber,
  key: entity.key as AnamnesisStepKey,
  payload: normalisePayload(entity.payload),
  completed: entity.completed,
  hasErrors: entity.hasErrors,
  validationScore:
    entity.validationScore === null ? undefined : (entity.validationScore ?? undefined),
  createdAt: toDate(entity.createdAt) ?? new Date(),
  updatedAt: toDate(entity.updatedAt) ?? new Date(),
});

export const mapTherapeuticPlanEntityToDomain = (
  entity: AnamnesisTherapeuticPlanEntity,
): TherapeuticPlanData => ({
  id: entity.id,
  anamnesisId: entity.anamnesisId,
  analysisId: entity.analysisId ?? undefined,
  clinicalReasoning: entity.clinicalReasoning ?? undefined,
  summary: entity.summary ?? undefined,
  therapeuticPlan: normalisePayload(entity.therapeuticPlan),
  riskFactors: castJsonArray<TherapeuticPlanData['riskFactors']>(entity.riskFactors),
  recommendations: castJsonArray<TherapeuticPlanData['recommendations']>(entity.recommendations),
  confidence: entity.confidence === null ? undefined : (entity.confidence ?? undefined),
  reviewRequired: entity.reviewRequired,
  approvalStatus: entity.approvalStatus,
  liked: entity.liked === null ? undefined : (entity.liked ?? undefined),
  feedbackComment: entity.feedbackComment ?? undefined,
  feedbackGivenBy: entity.feedbackGivenBy ?? undefined,
  feedbackGivenAt: toDate(entity.feedbackGivenAt),
  generatedAt: toDate(entity.generatedAt) ?? new Date(),
  createdAt: toDate(entity.createdAt) ?? new Date(),
  updatedAt: toDate(entity.updatedAt) ?? new Date(),
});

export const mapAttachmentEntityToDomain = (
  entity: AnamnesisAttachmentEntity,
): AnamnesisAttachment => ({
  id: entity.id,
  anamnesisId: entity.anamnesisId,
  stepNumber: entity.stepNumber ?? undefined,
  fileName: entity.fileName,
  mimeType: entity.mimeType,
  size: entity.size,
  storagePath: entity.storagePath,
  uploadedBy: entity.uploadedBy,
  uploadedAt: toDate(entity.uploadedAt) ?? new Date(),
});

export const mapAnamnesisEntityToDomain = (
  entity: AnamnesisEntity,
  options?: {
    steps?: boolean;
    latestPlan?: boolean;
    attachments?: boolean;
    aiAnalyses?: boolean;
  },
): Anamnesis => {
  const completionRateNumber = Number(entity.completionRate ?? 0);
  const steps =
    options?.steps && entity.steps
      ? entity.steps
          .slice()
          .sort((a, b) => a.stepNumber - b.stepNumber)
          .map(mapAnamnesisStepEntityToDomain)
      : undefined;

  let latestPlan: TherapeuticPlanData | null = null;
  if (options?.latestPlan && entity.plans && entity.plans.length > 0) {
    const sortedPlans = [...entity.plans].sort((a, b) => {
      const aTime = toDate(a.createdAt)?.getTime() ?? 0;
      const bTime = toDate(b.createdAt)?.getTime() ?? 0;
      return bTime - aTime;
    });
    latestPlan = mapTherapeuticPlanEntityToDomain(sortedPlans[0]);
  }

  const attachments =
    options?.attachments && entity.attachments
      ? entity.attachments.map(mapAttachmentEntityToDomain)
      : undefined;

  const aiAnalyses =
    options?.aiAnalyses && entity.aiAnalyses
      ? entity.aiAnalyses
          .slice()
          .sort((a, b) => {
            const aTime = toDate(a.respondedAt)?.getTime() ?? toDate(a.createdAt)?.getTime() ?? 0;
            const bTime = toDate(b.respondedAt)?.getTime() ?? toDate(b.createdAt)?.getTime() ?? 0;
            return bTime - aTime;
          })
          .map(mapAIAnalysisEntityToDomain)
      : undefined;
  return {
    id: entity.id,
    consultationId: entity.consultationId,
    patientId: entity.patientId,
    professionalId: entity.professionalId,
    tenantId: entity.tenantId,
    status: entity.status,
    totalSteps: entity.totalSteps,
    currentStep: entity.currentStep,
    completionRate: completionRateNumber,
    isDraft: entity.isDraft,
    lastAutoSavedAt: toDate(entity.lastAutoSavedAt),
    submittedAt: toDate(entity.submittedAt),
    completedAt: toDate(entity.completedAt),
    createdAt: toDate(entity.createdAt) ?? new Date(),
    updatedAt: toDate(entity.updatedAt) ?? new Date(),
    steps,
    latestPlan,
    attachments,
    aiAnalyses,
  };
};
