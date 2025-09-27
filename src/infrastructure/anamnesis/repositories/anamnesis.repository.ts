import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';

import {
  Anamnesis,
  AnamnesisAttachment,
  AnamnesisListFilters,
  AnamnesisListItem,
  AnamnesisRepositorySaveOptions,
  AnamnesisStep,
  AnamnesisStepKey,
  CreateAnamnesisAttachmentInput,
  CreateAnamnesisInput,
  RemoveAnamnesisAttachmentInput,
  SaveAnamnesisStepInput,
  SavePlanFeedbackInput,
  SaveTherapeuticPlanInput,
  SubmitAnamnesisInput,
  TherapeuticPlanData,
} from '../../../domain/anamnesis/types/anamnesis.types';
import { IAnamnesisRepository } from '../../../domain/anamnesis/interfaces/repositories/anamnesis.repository.interface';
import { AnamnesisEntity } from '../entities/anamnesis.entity';
import { AnamnesisStepEntity } from '../entities/anamnesis-step.entity';
import { AnamnesisTherapeuticPlanEntity } from '../entities/anamnesis-therapeutic-plan.entity';
import { AnamnesisAttachmentEntity } from '../entities/anamnesis-attachment.entity';
import {
  mapAnamnesisEntityToDomain,
  mapAnamnesisStepEntityToDomain,
  mapAttachmentEntityToDomain,
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

@Injectable()
export class AnamnesisRepository implements IAnamnesisRepository {
  private readonly logger = new Logger(AnamnesisRepository.name);

  constructor(
    @InjectRepository(AnamnesisEntity)
    private readonly anamnesisRepository: Repository<AnamnesisEntity>,
    @InjectRepository(AnamnesisStepEntity)
    private readonly stepRepository: Repository<AnamnesisStepEntity>,
    @InjectRepository(AnamnesisTherapeuticPlanEntity)
    private readonly planRepository: Repository<AnamnesisTherapeuticPlanEntity>,
    @InjectRepository(AnamnesisAttachmentEntity)
    private readonly attachmentRepository: Repository<AnamnesisAttachmentEntity>,
  ) {}

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
    options?: AnamnesisRepositorySaveOptions,
  ): Promise<Anamnesis | null> {
    const query = this.anamnesisRepository
      .createQueryBuilder('anamnesis')
      .where('anamnesis.id = :id', { id: anamnesisId })
      .andWhere('anamnesis.tenantId = :tenantId', { tenantId });

    if (options?.steps) {
      query.leftJoinAndSelect('anamnesis.steps', 'steps');
    }

    if (options?.attachments) {
      query.leftJoinAndSelect('anamnesis.attachments', 'attachments');
    }

    if (options?.latestPlan) {
      query.leftJoinAndSelect('anamnesis.plans', 'plans');
    }

    const entity = await query.getOne();
    if (!entity) {
      return null;
    }

    return mapAnamnesisEntityToDomain(entity, {
      steps: options?.steps,
      attachments: options?.attachments,
      latestPlan: options?.latestPlan,
    });
  }

  async findByConsultation(
    tenantId: string,
    consultationId: string,
    options?: AnamnesisRepositorySaveOptions,
  ): Promise<Anamnesis | null> {
    const query = this.anamnesisRepository
      .createQueryBuilder('anamnesis')
      .where('anamnesis.consultationId = :consultationId', { consultationId })
      .andWhere('anamnesis.tenantId = :tenantId', { tenantId });

    if (options?.steps) {
      query.leftJoinAndSelect('anamnesis.steps', 'steps');
    }

    if (options?.attachments) {
      query.leftJoinAndSelect('anamnesis.attachments', 'attachments');
    }

    if (options?.latestPlan) {
      query.leftJoinAndSelect('anamnesis.plans', 'plans');
    }

    const entity = await query.getOne();
    if (!entity) {
      return null;
    }

    return mapAnamnesisEntityToDomain(entity, {
      steps: options?.steps,
      attachments: options?.attachments,
      latestPlan: options?.latestPlan,
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

    const updatePayload: Partial<AnamnesisEntity> = {
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
      .andWhere('anamnesis.patientId = :patientId', { patientId });

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
    const plan = this.planRepository.create({
      anamnesisId: data.anamnesisId,
      clinicalReasoning: data.clinicalReasoning,
      summary: data.summary,
      therapeuticPlan: data.therapeuticPlan ?? null,
      riskFactors: data.riskFactors ?? null,
      recommendations: data.recommendations ?? null,
      confidence: data.confidence ?? null,
      reviewRequired: data.reviewRequired ?? false,
      approvalStatus: 'pending',
      generatedAt: data.generatedAt,
    });

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
    plan.liked = data.liked ?? null;
    plan.feedbackComment = data.feedbackComment ?? null;
    plan.feedbackGivenBy = data.feedbackGivenBy;
    plan.feedbackGivenAt = data.feedbackGivenAt;

    const updated = await this.planRepository.save(plan);

    return mapTherapeuticPlanEntityToDomain(updated);
  }

  async createAttachment(data: CreateAnamnesisAttachmentInput): Promise<AnamnesisAttachment> {
    const attachment = this.attachmentRepository.create({
      anamnesisId: data.anamnesisId,
      stepNumber: data.stepNumber ?? null,
      fileName: data.fileName,
      mimeType: data.mimeType,
      size: data.size,
      storagePath: data.storagePath,
      uploadedBy: data.uploadedBy,
    });

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
}
