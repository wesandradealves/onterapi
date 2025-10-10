import { clonePlain } from '../utils/clone.util';

import {
  Anamnesis,
  AnamnesisAIAnalysis,
  AnamnesisAttachment,
  AnamnesisStep,
  AnamnesisStepKey,
  AnamnesisStepTemplate,
  PatientAnamnesisRollup,
  TherapeuticPlanAcceptance,
  TherapeuticPlanAccessLog,
  TherapeuticPlanData,
  TherapeuticPlanStatus,
} from '../../domain/anamnesis/types/anamnesis.types';
import { AnamnesisEntity } from '../../infrastructure/anamnesis/entities/anamnesis.entity';
import { AnamnesisStepEntity } from '../../infrastructure/anamnesis/entities/anamnesis-step.entity';
import { AnamnesisTherapeuticPlanEntity } from '../../infrastructure/anamnesis/entities/anamnesis-therapeutic-plan.entity';
import { AnamnesisAttachmentEntity } from '../../infrastructure/anamnesis/entities/anamnesis-attachment.entity';
import { AnamnesisStepTemplateEntity } from '../../infrastructure/anamnesis/entities/anamnesis-step-template.entity';
import { AnamnesisAIAnalysisEntity } from '../../infrastructure/anamnesis/entities/anamnesis-ai-analysis.entity';
import { TherapeuticPlanAcceptanceEntity } from '../../infrastructure/anamnesis/entities/therapeutic-plan-acceptance.entity';
import { PatientAnamnesisRollupEntity } from '../../infrastructure/anamnesis/entities/patient-anamnesis-rollup.entity';
import { TherapeuticPlanAccessLogEntity } from '../../infrastructure/anamnesis/entities/therapeutic-plan-access-log.entity';
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
    return clonePlain(payload as Record<string, unknown>);
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
  planText: entity.planText ?? null,
  reasoningText: entity.reasoningText ?? null,
  evidenceMap: castJsonArray<Array<Record<string, unknown>>>(entity.evidenceMap) ?? null,
  confidence: entity.confidence === null ? undefined : (entity.confidence ?? undefined),
  model: entity.model ?? undefined,
  promptVersion: entity.promptVersion ?? undefined,
  tokensInput: entity.tokensInput ?? undefined,
  tokensOutput: entity.tokensOutput ?? undefined,
  latencyMs: entity.latencyMs ?? undefined,
  rawResponse: entity.rawResponse ? normalisePayload(entity.rawResponse) : null,
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
export const mapTherapeuticPlanAcceptanceEntityToDomain = (
  entity: TherapeuticPlanAcceptanceEntity,
): TherapeuticPlanAcceptance => ({
  id: entity.id,
  tenantId: entity.tenantId,
  therapeuticPlanId: entity.therapeuticPlanId,
  professionalId: entity.professionalId,
  accepted: entity.accepted,
  termsVersion: entity.termsVersion,
  termsTextSnapshot: entity.termsTextSnapshot,
  acceptedAt: toDate(entity.acceptedAt) ?? new Date(),
  acceptedIp: entity.acceptedIp ?? null,
  acceptedUserAgent: entity.acceptedUserAgent ?? null,
  createdAt: toDate(entity.createdAt) ?? new Date(),
  updatedAt: toDate(entity.updatedAt) ?? new Date(),
});

export const mapPatientRollupEntityToDomain = (
  entity: PatientAnamnesisRollupEntity,
): PatientAnamnesisRollup => ({
  id: entity.id,
  tenantId: entity.tenantId,
  patientId: entity.patientId,
  summaryText: entity.summaryText,
  summaryVersion: entity.summaryVersion,
  lastAnamnesisId: entity.lastAnamnesisId ?? null,
  updatedBy: entity.updatedBy ?? null,
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
export const mapTherapeuticPlanEntityToDomain = (
  entity: AnamnesisTherapeuticPlanEntity,
): TherapeuticPlanData => {
  const acceptances = entity.acceptances
    ? entity.acceptances.map(mapTherapeuticPlanAcceptanceEntityToDomain)
    : undefined;

  const latestAcceptance = acceptances && acceptances.length ? acceptances[0] : null;

  return {
    id: entity.id,
    anamnesisId: entity.anamnesisId,
    analysisId: entity.analysisId ?? undefined,
    clinicalReasoning: entity.clinicalReasoning ?? undefined,
    summary: entity.summary ?? undefined,
    therapeuticPlan: normalisePayload(entity.therapeuticPlan),
    riskFactors: castJsonArray<TherapeuticPlanData['riskFactors']>(entity.riskFactors),
    recommendations: castJsonArray<TherapeuticPlanData['recommendations']>(entity.recommendations),
    planText: entity.planText ?? null,
    reasoningText: entity.reasoningText ?? null,
    evidenceMap: castJsonArray<Array<Record<string, unknown>>>(entity.evidenceMap) ?? null,
    confidence: entity.confidence === null ? undefined : (entity.confidence ?? undefined),
    reviewRequired: entity.reviewRequired,
    status: (entity.status as TherapeuticPlanStatus) ?? 'generated',
    termsAccepted: entity.termsAccepted ?? false,
    approvalStatus: entity.approvalStatus,
    liked: entity.liked === null ? undefined : (entity.liked ?? undefined),
    feedbackComment: entity.feedbackComment ?? undefined,
    feedbackGivenBy: entity.feedbackGivenBy ?? undefined,
    feedbackGivenAt: toDate(entity.feedbackGivenAt),
    acceptedAt: toDate(entity.acceptedAt) ?? null,
    acceptedBy: entity.acceptedBy ?? null,
    termsVersion: entity.termsVersion ?? null,
    termsTextSnapshot: latestAcceptance?.termsTextSnapshot ?? null,
    generatedAt: toDate(entity.generatedAt) ?? new Date(),
    createdAt: toDate(entity.createdAt) ?? new Date(),
    updatedAt: toDate(entity.updatedAt) ?? new Date(),
    acceptances,
  };
};

export const mapTherapeuticPlanAccessLogEntityToDomain = (
  entity: TherapeuticPlanAccessLogEntity,
): TherapeuticPlanAccessLog => ({
  id: entity.id,
  tenantId: entity.tenantId,
  anamnesisId: entity.anamnesisId,
  planId: entity.planId,
  professionalId: entity.professionalId,
  viewerRole: entity.viewerRole,
  viewedAt: toDate(entity.viewedAt) ?? new Date(),
  ipAddress: entity.ipAddress ?? undefined,
  userAgent: entity.userAgent ?? undefined,
  createdAt: toDate(entity.createdAt) ?? new Date(),
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
    deletedAt: toDate(entity.deletedAt),
    deletedBy: entity.deletedBy ?? undefined,
    deletedReason: entity.deletedReason ?? undefined,
    steps,
    latestPlan,
    attachments,
    aiAnalyses,
  };
};
