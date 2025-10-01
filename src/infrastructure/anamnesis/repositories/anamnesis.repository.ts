import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, DeepPartial, Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';

import {
  Anamnesis,
  AnamnesisAIAnalysis,
  AnamnesisAITrainingFeedback,
  AnamnesisAttachment,
  AnamnesisHistoryEntry,
  AnamnesisHistoryFilters,
  AnamnesisListFilters,
  AnamnesisListItem,
  AnamnesisRepositoryFindOptions,
  AnamnesisStatus,
  AnamnesisStep,
  AnamnesisStepKey,
  AnamnesisStepTemplate,
  AutoSaveAnamnesisStepInput,
  CancelAnamnesisInput,
  CompleteAnamnesisAIAnalysisInput,
  CreateAnamnesisAIAnalysisInput,
  CreateAnamnesisAttachmentInput,
  CreateAnamnesisInput,
  CreateTherapeuticPlanAcceptanceInput,
  CreateTherapeuticPlanAccessLogInput,
  GetStepTemplatesFilters,
  PatientAnamnesisRollup,
  RecordAITrainingFeedbackInput,
  RemoveAnamnesisAttachmentInput,
  SaveAnamnesisStepInput,
  SavePlanFeedbackInput,
  SaveTherapeuticPlanInput,
  SubmitAnamnesisInput,
  TherapeuticPlanAcceptance,
  TherapeuticPlanData,
  UpsertPatientAnamnesisRollupInput,
} from '../../../domain/anamnesis/types/anamnesis.types';
import { IAnamnesisRepository } from '../../../domain/anamnesis/interfaces/repositories/anamnesis.repository.interface';
import { AnamnesisEntity } from '../entities/anamnesis.entity';
import { AnamnesisStepEntity } from '../entities/anamnesis-step.entity';
import { AnamnesisTherapeuticPlanEntity } from '../entities/anamnesis-therapeutic-plan.entity';
import { AnamnesisAttachmentEntity } from '../entities/anamnesis-attachment.entity';
import { AnamnesisStepTemplateEntity } from '../entities/anamnesis-step-template.entity';
import { AnamnesisAIAnalysisEntity } from '../entities/anamnesis-ai-analysis.entity';
import { TherapeuticPlanAcceptanceEntity } from '../entities/therapeutic-plan-acceptance.entity';
import { PatientAnamnesisRollupEntity } from '../entities/patient-anamnesis-rollup.entity';
import { TherapeuticPlanAccessLogEntity } from '../entities/therapeutic-plan-access-log.entity';
import { AnamnesisAITrainingFeedbackEntity } from '../entities/anamnesis-ai-feedback.entity';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import {
  mapAIAnalysisEntityToDomain,
  mapAnamnesisEntityToDomain,
  mapAnamnesisStepEntityToDomain,
  mapAttachmentEntityToDomain,
  mapPatientRollupEntityToDomain,
  mapStepTemplateEntityToDomain,
  mapTherapeuticPlanAcceptanceEntityToDomain,
  mapTherapeuticPlanEntityToDomain,
} from '../../../shared/mappers/anamnesis.mapper';

const STEP_ORDER: AnamnesisStepKey[] = [
  'identification',
  'chiefComplaint',
  'currentDisease',
  'pathologicalHistory',
  'familyHistory',
  'systemsReview',
  'lifestyle',
  'psychosocial',
  'medication',
  'physicalExam',
];

const stepKeyToNumber = (key: AnamnesisStepKey): number => {
  const index = STEP_ORDER.indexOf(key);
  return index >= 0 ? index + 1 : STEP_ORDER.length + 1;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const cloneRecord = (value?: Record<string, unknown>): Record<string, unknown> => {
  if (!value) {
    return {};
  }

  try {
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  } catch {
    return {};
  }
};

const mergeRecords = (
  base: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> => {
  const result: Record<string, unknown> = { ...base };

  Object.entries(patch).forEach(([key, value]) => {
    if (isPlainObject(value) && isPlainObject(result[key])) {
      result[key] = mergeRecords(result[key] as Record<string, unknown>, value);
      return;
    }

    result[key] = Array.isArray(value) ? JSON.parse(JSON.stringify(value)) : value;
  });

  return result;
};

interface TemplateSelectionContext {
  specialty?: string;
}

const toTimestamp = (value: Date | string | number): number => new Date(value).getTime();

const getTemplatePriority = (
  template: AnamnesisStepTemplateEntity,
  context: TemplateSelectionContext,
) => {
  const tenantPriority = template.tenantId ? 1 : 0;
  const requestedSpecialty = context.specialty;

  let specialtyPriority = 0;
  if (requestedSpecialty) {
    if (template.specialty === requestedSpecialty) {
      specialtyPriority = 2;
    } else if (!template.specialty || template.specialty === 'default') {
      specialtyPriority = 1;
    } else {
      specialtyPriority = 0;
    }
  } else {
    specialtyPriority = !template.specialty || template.specialty === 'default' ? 1 : 0;
  }

  return {
    tenantPriority,
    specialtyPriority,
    versionPriority: template.version ?? 0,
    updatedAt: toTimestamp(template.updatedAt),
  };
};

const shouldReplaceTemplate = (
  current: AnamnesisStepTemplateEntity,
  candidate: AnamnesisStepTemplateEntity,
  context: TemplateSelectionContext,
): boolean => {
  const currentPriority = getTemplatePriority(current, context);
  const candidatePriority = getTemplatePriority(candidate, context);

  if (candidatePriority.tenantPriority !== currentPriority.tenantPriority) {
    return candidatePriority.tenantPriority > currentPriority.tenantPriority;
  }

  if (candidatePriority.specialtyPriority !== currentPriority.specialtyPriority) {
    return candidatePriority.specialtyPriority > currentPriority.specialtyPriority;
  }

  if (candidatePriority.versionPriority !== currentPriority.versionPriority) {
    return candidatePriority.versionPriority > currentPriority.versionPriority;
  }

  return candidatePriority.updatedAt > currentPriority.updatedAt;
};

@Injectable()
export class AnamnesisRepository implements IAnamnesisRepository {
  private readonly logger = new Logger(AnamnesisRepository.name);
  private readonly anamnesisRepository: Repository<AnamnesisEntity>;
  private readonly stepRepository: Repository<AnamnesisStepEntity>;
  private readonly planRepository: Repository<AnamnesisTherapeuticPlanEntity>;
  private readonly attachmentRepository: Repository<AnamnesisAttachmentEntity>;
  private readonly stepTemplateRepository: Repository<AnamnesisStepTemplateEntity>;
  private readonly aiAnalysisRepository: Repository<AnamnesisAIAnalysisEntity>;
  private readonly planAcceptanceRepository: Repository<TherapeuticPlanAcceptanceEntity>;
  private readonly rollupRepository: Repository<PatientAnamnesisRollupEntity>;
  private readonly planAccessLogRepository: Repository<TherapeuticPlanAccessLogEntity>;
  private readonly aiFeedbackRepository: Repository<AnamnesisAITrainingFeedbackEntity>;

  constructor(
    @InjectDataSource()
    dataSource: DataSource,
  ) {
    this.anamnesisRepository = dataSource.getRepository(AnamnesisEntity);
    this.stepRepository = dataSource.getRepository(AnamnesisStepEntity);
    this.planRepository = dataSource.getRepository(AnamnesisTherapeuticPlanEntity);
    this.attachmentRepository = dataSource.getRepository(AnamnesisAttachmentEntity);
    this.stepTemplateRepository = dataSource.getRepository(AnamnesisStepTemplateEntity);
    this.aiAnalysisRepository = dataSource.getRepository(AnamnesisAIAnalysisEntity);
    this.planAcceptanceRepository = dataSource.getRepository(TherapeuticPlanAcceptanceEntity);
    this.rollupRepository = dataSource.getRepository(PatientAnamnesisRollupEntity);
    this.planAccessLogRepository = dataSource.getRepository(TherapeuticPlanAccessLogEntity);
    this.aiFeedbackRepository = dataSource.getRepository(AnamnesisAITrainingFeedbackEntity);
  }

  async create(data: CreateAnamnesisInput): Promise<Anamnesis> {
    const newAnamnesisId = uuid();

    const base = this.anamnesisRepository.create({
      id: newAnamnesisId,
      tenantId: data.tenantId,
      consultationId: data.consultationId,
      patientId: data.patientId,
      professionalId: data.professionalId,
      status: 'draft',
      totalSteps: data.totalSteps,
      currentStep: data.initialStep ?? 1,
      completionRate: 0,
      isDraft: true,
    });

    if (data.formData) {
      const steps: AnamnesisStepEntity[] = [];
      (Object.entries(data.formData) as [AnamnesisStepKey, Record<string, unknown>][]).forEach(
        ([key, payload]) => {
          if (!payload) {
            return;
          }

          const stepEntity = this.stepRepository.create({
            anamnesisId: newAnamnesisId,
            stepNumber: stepKeyToNumber(key),
            key,
            payload,
            completed: false,
            hasErrors: false,
          });

          steps.push(stepEntity);
        },
      );

      if (steps.length) {
        base.steps = steps;
      }
    }

    const saved = await this.anamnesisRepository.save(base);

    const stored = await this.findById(saved.tenantId, saved.id, {
      steps: true,
      latestPlan: false,
      attachments: false,
    });

    if (!stored) {
      throw new Error('Failed to persist anamnesis');
    }

    return stored;
  }

  async findById(
    tenantId: string,
    anamnesisId: string,
    options?: AnamnesisRepositoryFindOptions,
  ): Promise<Anamnesis | null> {
    const query = this.anamnesisRepository
      .createQueryBuilder('anamnesis')
      .where('anamnesis.id = :id', { id: anamnesisId })
      .andWhere('anamnesis.tenantId = :tenantId', { tenantId })
      .andWhere('anamnesis.deletedAt IS NULL');

    if (options?.steps) {
      query.leftJoinAndSelect('anamnesis.steps', 'steps');
    }

    if (options?.attachments) {
      query.leftJoinAndSelect('anamnesis.attachments', 'attachments');
    }

    if (options?.latestPlan) {
      query
        .leftJoinAndSelect('anamnesis.plans', 'plans')
        .leftJoinAndSelect('plans.acceptances', 'planAcceptances')
        .orderBy('plans.createdAt', 'DESC')
        .addOrderBy('planAcceptances.acceptedAt', 'DESC');
    }

    if (options?.aiAnalyses) {
      query.leftJoinAndSelect('anamnesis.aiAnalyses', 'aiAnalyses');
    }

    const entity = await query.getOne();
    if (!entity) {
      return null;
    }

    return mapAnamnesisEntityToDomain(entity, {
      steps: options?.steps,
      attachments: options?.attachments,
      latestPlan: options?.latestPlan,
      aiAnalyses: options?.aiAnalyses,
    });
  }

  async findByConsultation(
    tenantId: string,
    consultationId: string,
    options?: AnamnesisRepositoryFindOptions,
  ): Promise<Anamnesis | null> {
    const query = this.anamnesisRepository
      .createQueryBuilder('anamnesis')
      .where('anamnesis.consultationId = :consultationId', { consultationId })
      .andWhere('anamnesis.tenantId = :tenantId', { tenantId })
      .andWhere('anamnesis.deletedAt IS NULL');

    if (options?.steps) {
      query.leftJoinAndSelect('anamnesis.steps', 'steps');
    }

    if (options?.attachments) {
      query.leftJoinAndSelect('anamnesis.attachments', 'attachments');
    }

    if (options?.latestPlan) {
      query
        .leftJoinAndSelect('anamnesis.plans', 'plans')
        .leftJoinAndSelect('plans.acceptances', 'planAcceptances')
        .orderBy('plans.createdAt', 'DESC')
        .addOrderBy('planAcceptances.acceptedAt', 'DESC');
    }

    if (options?.aiAnalyses) {
      query.leftJoinAndSelect('anamnesis.aiAnalyses', 'aiAnalyses');
    }

    const entity = await query.getOne();
    if (!entity) {
      return null;
    }

    return mapAnamnesisEntityToDomain(entity, {
      steps: options?.steps,
      attachments: options?.attachments,
      latestPlan: options?.latestPlan,
      aiAnalyses: options?.aiAnalyses,
    });
  }

  async saveStep(data: SaveAnamnesisStepInput): Promise<AnamnesisStep> {
    const existing = await this.stepRepository.findOne({
      where: {
        anamnesisId: data.anamnesisId,
        stepNumber: data.stepNumber,
      },
    });

    let entity: AnamnesisStepEntity;

    if (existing) {
      entity = existing;
      entity.payload = data.payload;
      entity.completed = data.completed ?? entity.completed;
      entity.hasErrors = data.hasErrors ?? entity.hasErrors;
      entity.validationScore = data.validationScore ?? entity.validationScore;
      entity.key = data.key;
    } else {
      entity = this.stepRepository.create({
        anamnesisId: data.anamnesisId,
        stepNumber: data.stepNumber,
        key: data.key,
        payload: data.payload,
        completed: data.completed ?? false,
        hasErrors: data.hasErrors ?? false,
        validationScore: data.validationScore,
      });
    }

    const savedStep = await this.stepRepository.save(entity);

    const updatePayload: QueryDeepPartialEntity<AnamnesisEntity> = {
      lastAutoSavedAt: new Date(),
    };

    if (data.currentStep !== undefined) {
      updatePayload.currentStep = data.currentStep;
    }

    if (data.completionRate !== undefined) {
      updatePayload.completionRate = data.completionRate;
    }

    await this.anamnesisRepository.update(
      { id: data.anamnesisId, tenantId: data.tenantId },
      updatePayload,
    );

    return mapAnamnesisStepEntityToDomain(savedStep);
  }

  async autoSaveStep(data: AutoSaveAnamnesisStepInput): Promise<AnamnesisStep> {
    const existing = await this.stepRepository.findOne({
      where: {
        anamnesisId: data.anamnesisId,
        stepNumber: data.stepNumber,
      },
    });

    const autoSavedAt = data.autoSavedAt ?? new Date();

    if (existing && data.autoSavedAt) {
      const existingUpdatedAt = existing.updatedAt?.getTime();
      if (existingUpdatedAt && data.autoSavedAt.getTime() <= existingUpdatedAt) {
        const lastTimestamp = existing.updatedAt ?? autoSavedAt;

        await this.anamnesisRepository.update(
          { id: data.anamnesisId, tenantId: data.tenantId },
          {
            lastAutoSavedAt: lastTimestamp,
            updatedAt: lastTimestamp,
          },
        );

        return mapAnamnesisStepEntityToDomain(existing);
      }
    }

    const payloadPatch = cloneRecord(data.payload);

    let entity: AnamnesisStepEntity;

    if (existing) {
      entity = existing;
      const currentPayload = cloneRecord(existing.payload);
      entity.payload = mergeRecords(currentPayload, payloadPatch);
      entity.hasErrors = data.hasErrors ?? entity.hasErrors;
      entity.validationScore = data.validationScore ?? entity.validationScore;
      entity.key = data.key;
    } else {
      entity = this.stepRepository.create({
        anamnesisId: data.anamnesisId,
        stepNumber: data.stepNumber,
        key: data.key,
        payload: payloadPatch,
        completed: false,
        hasErrors: data.hasErrors ?? false,
        validationScore: data.validationScore,
      });
    }

    const saved = await this.stepRepository.save(entity);

    if (data.autoSavedAt) {
      await this.stepRepository
        .createQueryBuilder()
        .update(AnamnesisStepEntity)
        .set({ updatedAt: autoSavedAt })
        .where('id = :id', { id: saved.id })
        .execute();

      saved.updatedAt = autoSavedAt;
    }

    await this.anamnesisRepository.update(
      { id: data.anamnesisId, tenantId: data.tenantId },
      {
        lastAutoSavedAt: autoSavedAt,
        updatedAt: autoSavedAt,
      },
    );

    return mapAnamnesisStepEntityToDomain(saved);
  }

  async listByPatient(
    tenantId: string,
    patientId: string,
    filters?: AnamnesisListFilters,
  ): Promise<AnamnesisListItem[]> {
    const query = this.anamnesisRepository
      .createQueryBuilder('anamnesis')
      .select([
        'anamnesis.id',
        'anamnesis.consultationId',
        'anamnesis.patientId',
        'anamnesis.professionalId',
        'anamnesis.status',
        'anamnesis.completionRate',
        'anamnesis.submittedAt',
        'anamnesis.updatedAt',
      ])
      .where('anamnesis.tenantId = :tenantId', { tenantId })
      .andWhere('anamnesis.patientId = :patientId', { patientId })
      .andWhere('anamnesis.deletedAt IS NULL');

    if (filters?.status && filters.status.length) {
      query.andWhere('anamnesis.status IN (:...status)', { status: filters.status });
    }

    if (filters?.professionalId) {
      query.andWhere('anamnesis.professionalId = :professionalId', {
        professionalId: filters.professionalId,
      });
    }

    if (filters?.from) {
      query.andWhere('anamnesis.updatedAt >= :from', { from: filters.from });
    }

    if (filters?.to) {
      query.andWhere('anamnesis.updatedAt <= :to', { to: filters.to });
    }

    const entities = await query.orderBy('anamnesis.updatedAt', 'DESC').getMany();

    return entities.map((entity) => ({
      id: entity.id,
      consultationId: entity.consultationId,
      patientId: entity.patientId,
      professionalId: entity.professionalId,
      status: entity.status,
      completionRate: Number(entity.completionRate ?? 0),
      submittedAt: entity.submittedAt ?? undefined,
      updatedAt: entity.updatedAt,
    }));
  }

  async getHistoryByPatient(
    tenantId: string,
    patientId: string,
    filters?: AnamnesisHistoryFilters,
  ): Promise<AnamnesisHistoryEntry[]> {
    const defaultStatuses: AnamnesisStatus[] = ['submitted', 'completed'];

    let statuses = filters?.statuses;
    if (!filters?.includeDrafts) {
      statuses = (statuses ?? defaultStatuses).filter((status) => status !== 'draft');
      if (!statuses.length) {
        statuses = defaultStatuses;
      }
    }

    const query = this.anamnesisRepository
      .createQueryBuilder('anamnesis')
      .leftJoinAndSelect('anamnesis.steps', 'steps')
      .leftJoinAndSelect('anamnesis.attachments', 'attachments')
      .leftJoinAndSelect('anamnesis.plans', 'plans')
      .where('anamnesis.tenantId = :tenantId', { tenantId })
      .andWhere('anamnesis.patientId = :patientId', { patientId })
      .andWhere('anamnesis.deletedAt IS NULL');

    if (statuses && statuses.length) {
      query.andWhere('anamnesis.status IN (:...statuses)', { statuses });
    }

    if (filters?.professionalId) {
      query.andWhere('anamnesis.professionalId = :professionalId', {
        professionalId: filters.professionalId,
      });
    }

    const limit = filters?.limit && filters.limit > 0 ? filters.limit : 10;
    query.take(limit);

    query.orderBy('anamnesis.submittedAt', 'DESC', 'NULLS LAST');
    query.addOrderBy('anamnesis.updatedAt', 'DESC');
    query.addOrderBy('steps.stepNumber', 'ASC');
    query.addOrderBy('steps.updatedAt', 'DESC');

    const entities = await query.getMany();

    return entities.map((entity) => {
      const anamnesis = mapAnamnesisEntityToDomain(entity, {
        steps: true,
        attachments: true,
        latestPlan: true,
      });

      const steps =
        anamnesis.steps?.map((step) => ({
          stepNumber: step.stepNumber,
          key: step.key,
          completed: step.completed,
          hasErrors: step.hasErrors,
          validationScore: step.validationScore,
          updatedAt: new Date(step.updatedAt.getTime()),
          payload: JSON.parse(JSON.stringify(step.payload ?? {})),
        })) ?? [];

      const attachments =
        anamnesis.attachments?.map((attachment) => ({
          ...attachment,
          uploadedAt: attachment.uploadedAt
            ? new Date(attachment.uploadedAt.getTime())
            : attachment.uploadedAt,
        })) ?? [];

      const latestPlan = anamnesis.latestPlan
        ? {
            ...anamnesis.latestPlan,
            therapeuticPlan: anamnesis.latestPlan.therapeuticPlan
              ? JSON.parse(JSON.stringify(anamnesis.latestPlan.therapeuticPlan))
              : undefined,
            riskFactors: anamnesis.latestPlan.riskFactors
              ? anamnesis.latestPlan.riskFactors.map((factor) => ({ ...factor }))
              : undefined,
            recommendations: anamnesis.latestPlan.recommendations
              ? anamnesis.latestPlan.recommendations.map((recommendation) => ({
                  ...recommendation,
                }))
              : undefined,
            generatedAt: new Date(anamnesis.latestPlan.generatedAt.getTime()),
            createdAt: new Date(anamnesis.latestPlan.createdAt.getTime()),
            updatedAt: new Date(anamnesis.latestPlan.updatedAt.getTime()),
            feedbackGivenAt: anamnesis.latestPlan.feedbackGivenAt
              ? new Date(anamnesis.latestPlan.feedbackGivenAt.getTime())
              : undefined,
          }
        : null;

      return {
        id: anamnesis.id,
        consultationId: anamnesis.consultationId,
        professionalId: anamnesis.professionalId,
        status: anamnesis.status,
        completionRate: anamnesis.completionRate,
        submittedAt: anamnesis.submittedAt ?? undefined,
        updatedAt: new Date(anamnesis.updatedAt.getTime()),
        steps,
        attachments,
        latestPlan,
      };
    });
  }
  async submit(data: SubmitAnamnesisInput): Promise<Anamnesis> {
    await this.anamnesisRepository.update(
      { id: data.anamnesisId, tenantId: data.tenantId },
      {
        status: 'submitted',
        isDraft: false,
        submittedAt: data.submissionDate,
        completionRate: data.completionRate,
        updatedAt: data.submissionDate,
      },
    );

    const updated = await this.findById(data.tenantId, data.anamnesisId, {
      steps: true,
      attachments: true,
      latestPlan: true,
    });

    if (!updated) {
      throw new Error('Anamnesis not found after submit');
    }

    return updated;
  }

  async saveTherapeuticPlan(data: SaveTherapeuticPlanInput): Promise<TherapeuticPlanData> {
    const planData: DeepPartial<AnamnesisTherapeuticPlanEntity> = {
      anamnesisId: data.anamnesisId,
      analysisId: data.analysisId ?? undefined,
      clinicalReasoning: data.clinicalReasoning,
      summary: data.summary,
      therapeuticPlan: data.therapeuticPlan
        ? JSON.parse(JSON.stringify(data.therapeuticPlan))
        : undefined,
      riskFactors: data.riskFactors ? JSON.parse(JSON.stringify(data.riskFactors)) : undefined,
      recommendations: data.recommendations
        ? JSON.parse(JSON.stringify(data.recommendations))
        : undefined,
      planText: data.planText ?? undefined,
      reasoningText: data.reasoningText ?? undefined,
      evidenceMap: data.evidenceMap ? JSON.parse(JSON.stringify(data.evidenceMap)) : null,
      confidence: data.confidence ?? undefined,
      reviewRequired: data.reviewRequired ?? false,
      status: data.status ?? 'generated',
      termsAccepted: data.termsAccepted,
      acceptedAt: data.acceptedAt ?? undefined,
      acceptedBy: data.acceptedBy ?? undefined,
      termsVersion: data.termsVersion ?? undefined,
      approvalStatus: 'pending',
      generatedAt: data.generatedAt,
    };

    const plan = this.planRepository.create(planData);
    const saved = await this.planRepository.save(plan);

    return mapTherapeuticPlanEntityToDomain(saved);
  }

  async savePlanFeedback(data: SavePlanFeedbackInput): Promise<TherapeuticPlanData> {
    const plan = await this.planRepository.findOne({
      where: { anamnesisId: data.anamnesisId },
      order: { createdAt: 'DESC' },
    });

    if (!plan) {
      throw new Error('Therapeutic plan not found');
    }

    plan.approvalStatus = data.approvalStatus;
    plan.liked = data.liked ?? undefined;
    plan.feedbackComment = data.feedbackComment ?? undefined;
    plan.feedbackGivenBy = data.feedbackGivenBy;
    plan.feedbackGivenAt = data.feedbackGivenAt;

    const updated = await this.planRepository.save(plan);

    try {
      await this.recordAITrainingFeedback({
        tenantId: data.tenantId,
        anamnesisId: data.anamnesisId,
        planId: updated.id,
        analysisId: updated.analysisId ?? null,
        approvalStatus: updated.approvalStatus as AnamnesisAITrainingFeedback['approvalStatus'],
        liked: typeof updated.liked === 'boolean' ? updated.liked : undefined,
        feedbackComment: updated.feedbackComment ?? undefined,
        feedbackGivenBy: updated.feedbackGivenBy ?? data.feedbackGivenBy,
      });
    } catch (error) {
      this.logger.warn(
        `Nao foi possivel registrar feedback de IA para o plano ${updated.id}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    return mapTherapeuticPlanEntityToDomain(updated);
  }

  async listPlanAcceptances(
    tenantId: string,
    therapeuticPlanId: string,
  ): Promise<TherapeuticPlanAcceptance[]> {
    const entities = await this.planAcceptanceRepository.find({
      where: { tenantId, therapeuticPlanId },
      order: { acceptedAt: 'DESC', createdAt: 'DESC' },
    });

    return entities.map(mapTherapeuticPlanAcceptanceEntityToDomain);
  }

  async createPlanAcceptance(
    data: CreateTherapeuticPlanAcceptanceInput,
  ): Promise<TherapeuticPlanAcceptance> {
    const entity = this.planAcceptanceRepository.create({
      id: uuid(),
      tenantId: data.tenantId,
      therapeuticPlanId: data.therapeuticPlanId,
      professionalId: data.professionalId,
      accepted: true,
      termsVersion: data.termsVersion,
      termsTextSnapshot: data.termsTextSnapshot,
      acceptedAt: data.acceptedAt,
      acceptedIp: data.acceptedIp ?? null,
      acceptedUserAgent: data.acceptedUserAgent ?? null,
    });

    const saved = await this.planAcceptanceRepository.save(entity);

    return mapTherapeuticPlanAcceptanceEntityToDomain(saved);
  }

  async createPlanAccessLog(data: CreateTherapeuticPlanAccessLogInput): Promise<void> {
    const entity = this.planAccessLogRepository.create({
      id: uuid(),
      tenantId: data.tenantId,
      anamnesisId: data.anamnesisId,
      planId: data.planId,
      professionalId: data.professionalId,
      viewerRole: data.viewerRole,
      viewedAt: data.viewedAt,
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
    });

    await this.planAccessLogRepository.save(entity);
  }

  async getPatientRollup(
    tenantId: string,
    patientId: string,
  ): Promise<PatientAnamnesisRollup | null> {
    const entity = await this.rollupRepository.findOne({ where: { tenantId, patientId } });

    return entity ? mapPatientRollupEntityToDomain(entity) : null;
  }

  async savePatientRollup(
    data: UpsertPatientAnamnesisRollupInput,
  ): Promise<PatientAnamnesisRollup> {
    const existing = await this.rollupRepository.findOne({
      where: { tenantId: data.tenantId, patientId: data.patientId },
    });

    if (existing) {
      existing.summaryText = data.summaryText;
      existing.summaryVersion = data.summaryVersion;
      existing.lastAnamnesisId = data.lastAnamnesisId ?? null;
      existing.updatedBy = data.updatedBy ?? null;

      const saved = await this.rollupRepository.save(existing);

      return mapPatientRollupEntityToDomain(saved);
    }

    const entity = this.rollupRepository.create({
      id: uuid(),
      tenantId: data.tenantId,
      patientId: data.patientId,
      summaryText: data.summaryText,
      summaryVersion: data.summaryVersion,
      lastAnamnesisId: data.lastAnamnesisId ?? null,
      updatedBy: data.updatedBy ?? null,
    });

    const saved = await this.rollupRepository.save(entity);

    return mapPatientRollupEntityToDomain(saved);
  }

  async recordAITrainingFeedback(
    data: RecordAITrainingFeedbackInput,
  ): Promise<AnamnesisAITrainingFeedback> {
    const entity = this.aiFeedbackRepository.create({
      tenantId: data.tenantId,
      anamnesisId: data.anamnesisId,
      planId: data.planId,
      analysisId: data.analysisId ?? null,
      approvalStatus: data.approvalStatus,
      liked: typeof data.liked === 'boolean' ? data.liked : null,
      feedbackComment: data.feedbackComment ?? null,
      feedbackGivenBy: data.feedbackGivenBy,
    } as DeepPartial<AnamnesisAITrainingFeedbackEntity>) as AnamnesisAITrainingFeedbackEntity;

    const saved = await this.aiFeedbackRepository.save(entity);

    return {
      id: saved.id,
      tenantId: saved.tenantId,
      anamnesisId: saved.anamnesisId,
      planId: saved.planId,
      analysisId: saved.analysisId ?? undefined,
      approvalStatus: saved.approvalStatus as AnamnesisAITrainingFeedback['approvalStatus'],
      liked: typeof saved.liked === 'boolean' ? saved.liked : undefined,
      feedbackComment: saved.feedbackComment ?? undefined,
      feedbackGivenBy: saved.feedbackGivenBy,
      createdAt: saved.createdAt ?? new Date(),
    };
  }

  async cancel(input: CancelAnamnesisInput): Promise<void> {
    const now = new Date();

    const result = await this.anamnesisRepository
      .createQueryBuilder()
      .update(AnamnesisEntity)
      .set({
        status: 'cancelled',
        isDraft: false,
        updatedAt: now,
        deletedAt: now,
        deletedBy: input.requestedBy,
        deletedReason: input.reason ?? null,
      })
      .where('id = :id', { id: input.anamnesisId })
      .andWhere('tenant_id = :tenantId', { tenantId: input.tenantId })
      .andWhere('deleted_at IS NULL')
      .execute();

    if (!result.affected) {
      throw new Error('Anamnesis not found or already cancelled');
    }
  }

  async createAttachment(data: CreateAnamnesisAttachmentInput): Promise<AnamnesisAttachment> {
    const attachmentData: DeepPartial<AnamnesisAttachmentEntity> = {
      anamnesisId: data.anamnesisId,
      stepNumber: data.stepNumber ?? undefined,
      fileName: data.fileName,
      mimeType: data.mimeType,
      size: data.size,
      storagePath: data.storagePath,
      uploadedBy: data.uploadedBy,
    };

    const attachment = this.attachmentRepository.create(attachmentData);
    const saved = await this.attachmentRepository.save(attachment);

    return mapAttachmentEntityToDomain(saved);
  }

  async removeAttachment(data: RemoveAnamnesisAttachmentInput): Promise<void> {
    const attachment = await this.attachmentRepository.findOne({
      where: { id: data.attachmentId },
      relations: ['anamnesis'],
    });

    if (!attachment || attachment.anamnesis.tenantId !== data.tenantId) {
      return;
    }

    await this.attachmentRepository.delete({ id: data.attachmentId });
  }

  async getStepTemplates(filters?: GetStepTemplatesFilters): Promise<AnamnesisStepTemplate[]> {
    const query = this.stepTemplateRepository.createQueryBuilder('template');

    if (!filters?.includeInactive) {
      query.andWhere('template.isActive = :active', { active: true });
    }

    if (filters?.tenantId) {
      query.andWhere('(template.tenantId IS NULL OR template.tenantId = :tenantId)', {
        tenantId: filters.tenantId,
      });
    } else {
      query.andWhere('template.tenantId IS NULL');
    }

    if (filters?.specialty) {
      query.andWhere(
        'template.specialty IS NULL OR template.specialty = :specialty OR template.specialty = :defaultSpecialty',
        {
          specialty: filters.specialty,
          defaultSpecialty: 'default',
        },
      );
    } else {
      query.andWhere('template.specialty IS NULL OR template.specialty = :defaultSpecialty', {
        defaultSpecialty: 'default',
      });
    }

    const entities = await query
      .orderBy('template.key', 'ASC')
      .addOrderBy('template.tenantId', 'DESC')
      .addOrderBy('template.version', 'DESC')
      .getMany();

    const selectionContext: TemplateSelectionContext = {
      specialty: filters?.specialty,
    };

    const latestPerKey = new Map<string, AnamnesisStepTemplateEntity>();

    for (const entity of entities) {
      const existing = latestPerKey.get(entity.key);
      if (!existing || shouldReplaceTemplate(existing, entity, selectionContext)) {
        latestPerKey.set(entity.key, entity);
      }
    }

    const templates = Array.from(latestPerKey.values())
      .map(mapStepTemplateEntityToDomain)
      .sort(
        (a, b) =>
          stepKeyToNumber(a.key as AnamnesisStepKey) - stepKeyToNumber(b.key as AnamnesisStepKey),
      );

    return templates;
  }

  async getStepTemplateByKey(
    key: AnamnesisStepKey,
    filters?: GetStepTemplatesFilters,
  ): Promise<AnamnesisStepTemplate | null> {
    const query = this.stepTemplateRepository
      .createQueryBuilder('template')
      .where('template.key = :key', { key });

    if (!filters?.includeInactive) {
      query.andWhere('template.isActive = :active', { active: true });
    }

    if (filters?.tenantId) {
      query.andWhere('(template.tenantId IS NULL OR template.tenantId = :tenantId)', {
        tenantId: filters.tenantId,
      });
    } else {
      query.andWhere('template.tenantId IS NULL');
    }

    if (filters?.specialty) {
      query.andWhere(
        'template.specialty IS NULL OR template.specialty = :specialty OR template.specialty = :defaultSpecialty',
        {
          specialty: filters.specialty,
          defaultSpecialty: 'default',
        },
      );
    } else {
      query.andWhere('template.specialty IS NULL OR template.specialty = :defaultSpecialty', {
        defaultSpecialty: 'default',
      });
    }

    const entities = await query
      .orderBy('template.tenantId', 'DESC')
      .addOrderBy('template.version', 'DESC')
      .getMany();

    if (!entities.length) {
      return null;
    }

    const selectionContext: TemplateSelectionContext = {
      specialty: filters?.specialty,
    };

    let best = entities[0];
    for (let index = 1; index < entities.length; index += 1) {
      const candidate = entities[index];
      if (shouldReplaceTemplate(best, candidate, selectionContext)) {
        best = candidate;
      }
    }

    return mapStepTemplateEntityToDomain(best);
  }

  async createAIAnalysis(data: CreateAnamnesisAIAnalysisInput): Promise<AnamnesisAIAnalysis> {
    const analysis = this.aiAnalysisRepository.create({
      anamnesisId: data.anamnesisId,
      tenantId: data.tenantId,
      status: data.status ?? 'pending',
      payload: data.payload ? JSON.parse(JSON.stringify(data.payload)) : undefined,
      generatedAt: new Date(),
    });

    const saved = await this.aiAnalysisRepository.save(analysis);

    return mapAIAnalysisEntityToDomain(saved);
  }

  async completeAIAnalysis(data: CompleteAnamnesisAIAnalysisInput): Promise<AnamnesisAIAnalysis> {
    const analysis = await this.aiAnalysisRepository.findOne({
      where: { id: data.analysisId, tenantId: data.tenantId },
    });

    if (!analysis) {
      throw new Error('AI analysis not found');
    }

    if (data.status) {
      analysis.status = data.status;
    } else {
      analysis.status = 'completed';
    }

    analysis.clinicalReasoning = data.clinicalReasoning ?? analysis.clinicalReasoning;
    analysis.summary = data.summary ?? analysis.summary;
    if (data.riskFactors !== undefined) {
      analysis.riskFactors = JSON.parse(JSON.stringify(data.riskFactors));
    }
    if (data.recommendations !== undefined) {
      analysis.recommendations = JSON.parse(JSON.stringify(data.recommendations));
    }
    if (data.confidence !== undefined) {
      analysis.confidence = data.confidence;
    }
    if (data.payload !== undefined) {
      analysis.payload = JSON.parse(JSON.stringify(data.payload));
    }
    analysis.respondedAt = data.respondedAt;
    if (typeof data.errorMessage !== 'undefined') {
      analysis.errorMessage = data.errorMessage ?? undefined;
    }

    const saved = await this.aiAnalysisRepository.save(analysis);

    return mapAIAnalysisEntityToDomain(saved);
  }

  async getLatestAIAnalysis(
    tenantId: string,
    anamnesisId: string,
  ): Promise<AnamnesisAIAnalysis | null> {
    const entity = await this.aiAnalysisRepository.findOne({
      where: { tenantId, anamnesisId },
      order: { respondedAt: 'DESC', createdAt: 'DESC' },
    });

    return entity ? mapAIAnalysisEntityToDomain(entity) : null;
  }
}
