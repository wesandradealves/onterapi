import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AnamnesisController } from '@modules/anamnesis/api/controllers/anamnesis.controller';
import { RolesEnum } from '@domain/auth/enums/roles.enum';
import { ICurrentUser } from '@domain/auth/interfaces/current-user.interface';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { TenantGuard } from '@modules/auth/guards/tenant.guard';
import { ConfigService } from '@nestjs/config';
import {
  IAnamnesisRepositoryToken as ANAMNESIS_REPOSITORY_TOKEN,
  IAnamnesisRepository,
} from '@domain/anamnesis/interfaces/repositories/anamnesis.repository.interface';
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
  AnamnesisStep,
  AnamnesisStepKey,
  AnamnesisStepTemplate,
  AutoSaveAnamnesisStepInput,
  CompleteAnamnesisAIAnalysisInput,
  CreateAnamnesisAIAnalysisInput,
  CreateAnamnesisAttachmentInput,
  CreateAnamnesisInput,
  GetStepTemplatesFilters,
  RecordAITrainingFeedbackInput,
  RemoveAnamnesisAttachmentInput,
  SaveAnamnesisStepInput,
  SavePlanFeedbackInput,
  SaveTherapeuticPlanInput,
  SubmitAnamnesisInput,
  TherapeuticPlanData,
} from '@domain/anamnesis/types/anamnesis.types';
import { IStartAnamnesisUseCase } from '@domain/anamnesis/interfaces/use-cases/start-anamnesis.use-case.interface';
import { IGetAnamnesisUseCase } from '@domain/anamnesis/interfaces/use-cases/get-anamnesis.use-case.interface';
import { ISaveAnamnesisStepUseCase } from '@domain/anamnesis/interfaces/use-cases/save-anamnesis-step.use-case.interface';
import { IAutoSaveAnamnesisUseCase } from '@domain/anamnesis/interfaces/use-cases/auto-save-anamnesis.use-case.interface';
import { ISubmitAnamnesisUseCase } from '@domain/anamnesis/interfaces/use-cases/submit-anamnesis.use-case.interface';
import { IListAnamnesesByPatientUseCase } from '@domain/anamnesis/interfaces/use-cases/list-anamneses-by-patient.use-case.interface';
import { IGetAnamnesisHistoryUseCase } from '@domain/anamnesis/interfaces/use-cases/get-anamnesis-history.use-case.interface';
import { ISaveTherapeuticPlanUseCase } from '@domain/anamnesis/interfaces/use-cases/save-therapeutic-plan.use-case.interface';
import { ISavePlanFeedbackUseCase } from '@domain/anamnesis/interfaces/use-cases/save-plan-feedback.use-case.interface';
import { ICreateAnamnesisAttachmentUseCase } from '@domain/anamnesis/interfaces/use-cases/create-anamnesis-attachment.use-case.interface';
import { IRemoveAnamnesisAttachmentUseCase } from '@domain/anamnesis/interfaces/use-cases/remove-anamnesis-attachment.use-case.interface';
import { IReceiveAnamnesisAIResultUseCase } from '@domain/anamnesis/interfaces/use-cases/receive-anamnesis-ai-result.use-case.interface';
import { IListAnamnesisStepTemplatesUseCase } from '@domain/anamnesis/interfaces/use-cases/list-anamnesis-step-templates.use-case.interface';
import {
  IPatientRepository,
  IPatientRepositoryToken,
} from '@domain/patients/interfaces/repositories/patient.repository.interface';
import {
  IAuthRepository,
  IAuthRepositoryToken,
} from '@domain/auth/interfaces/repositories/auth.repository.interface';
import {
  IAnamnesisAttachmentStorageService,
  IAnamnesisAttachmentStorageServiceToken,
} from '@domain/anamnesis/interfaces/services/anamnesis-attachment-storage.service.interface';
import { StartAnamnesisUseCase } from '@modules/anamnesis/use-cases/start-anamnesis.use-case';
import { GetAnamnesisUseCase } from '@modules/anamnesis/use-cases/get-anamnesis.use-case';
import { SaveAnamnesisStepUseCase } from '@modules/anamnesis/use-cases/save-anamnesis-step.use-case';
import { AutoSaveAnamnesisUseCase } from '@modules/anamnesis/use-cases/auto-save-anamnesis.use-case';
import { SubmitAnamnesisUseCase } from '@modules/anamnesis/use-cases/submit-anamnesis.use-case';
import { ListAnamnesesByPatientUseCase } from '@modules/anamnesis/use-cases/list-anamneses-by-patient.use-case';
import { GetAnamnesisHistoryUseCase } from '@modules/anamnesis/use-cases/get-anamnesis-history.use-case';
import { SaveTherapeuticPlanUseCase } from '@modules/anamnesis/use-cases/save-therapeutic-plan.use-case';
import { SavePlanFeedbackUseCase } from '@modules/anamnesis/use-cases/save-plan-feedback.use-case';
import { CreateAnamnesisAttachmentUseCase } from '@modules/anamnesis/use-cases/create-anamnesis-attachment.use-case';
import { RemoveAnamnesisAttachmentUseCase } from '@modules/anamnesis/use-cases/remove-anamnesis-attachment.use-case';
import { ReceiveAnamnesisAIResultUseCase } from '@modules/anamnesis/use-cases/receive-anamnesis-ai-result.use-case';
import { ListAnamnesisStepTemplatesUseCase } from '@modules/anamnesis/use-cases/list-anamnesis-step-templates.use-case';
import { MessageBus } from '@shared/messaging/message-bus';
import { DomainEvent } from '@shared/events/domain-event.interface';
import { DomainEvents } from '@shared/events/domain-events';
import { AnamnesisErrorFactory } from '@shared/factories/anamnesis-error.factory';

class FakeMessageBus {
  public readonly events: DomainEvent[] = [];

  async publish<T = Record<string, unknown>>(event: DomainEvent<T>): Promise<void> {
    this.events.push(event);
  }

  async publishMany<T = Record<string, unknown>>(events: DomainEvent<T>[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  subscribe(): void {}

  unsubscribe(): void {}
}

const clonePayload = <T>(value: T): T => {
  try {
    return JSON.parse(JSON.stringify(value ?? {}));
  } catch {
    return value as T;
  }
};

type RepositoryAttachment = AnamnesisAttachment & { uploadedAt: Date };

type RepositoryPlan = TherapeuticPlanData & { generatedAt: Date; updatedAt: Date };

type RepositoryAnamnesis = Anamnesis & {
  steps: AnamnesisStep[];
  attachments: RepositoryAttachment[];
  latestPlan: RepositoryPlan | null;
  aiAnalyses?: AnamnesisAIAnalysis[];
};

class InMemoryAnamnesisRepository implements IAnamnesisRepository {
  private readonly records = new Map<string, RepositoryAnamnesis>();
  private readonly templates = new Map<AnamnesisStepKey, AnamnesisStepTemplate>();
  private readonly analyses = new Map<string, AnamnesisAIAnalysis>();
  private sequence = 1;
  private readonly trainingFeedbacks: AnamnesisAITrainingFeedback[] = [];

  constructor() {
    this.templates.set('identification', {
      id: 'template-identification',
      key: 'identification',
      name: 'Identificacao',
      description: 'Dados basicos do paciente',
      schema: {},
      tenantId: null,
      isActive: true,
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-01T00:00:00Z'),
    });
  }

  async create(data: CreateAnamnesisInput): Promise<Anamnesis> {
    const now = new Date();
    const record: RepositoryAnamnesis = {
      id: this.generateId('anamnesis'),
      consultationId: data.consultationId,
      patientId: data.patientId,
      professionalId: data.professionalId,
      tenantId: data.tenantId,
      status: 'draft',
      totalSteps: data.totalSteps,
      currentStep: data.initialStep ?? 1,
      completionRate: 0,
      isDraft: true,
      lastAutoSavedAt: undefined,
      submittedAt: undefined,
      completedAt: undefined,
      createdAt: now,
      updatedAt: now,
      steps: [],
      latestPlan: null,
      attachments: [],
      aiAnalyses: [],
    };

    this.records.set(record.id, record);
    return this.cloneAnamnesis(record);
  }

  async findById(
    tenantId: string,
    anamnesisId: string,
    options?: AnamnesisRepositoryFindOptions,
  ): Promise<Anamnesis | null> {
    const record = this.records.get(anamnesisId);

    if (!record || record.tenantId !== tenantId) {
      return null;
    }

    return this.cloneAnamnesis(record, options);
  }

  async findByConsultation(
    tenantId: string,
    consultationId: string,
    options?: AnamnesisRepositoryFindOptions,
  ): Promise<Anamnesis | null> {
    const record = Array.from(this.records.values()).find(
      (item) => item.tenantId === tenantId && item.consultationId === consultationId,
    );

    if (!record) {
      return null;
    }

    return this.cloneAnamnesis(record, options);
  }

  async saveStep(data: SaveAnamnesisStepInput): Promise<AnamnesisStep> {
    const record = this.records.get(data.anamnesisId);

    if (!record || record.tenantId !== data.tenantId) {
      throw AnamnesisErrorFactory.notFound();
    }

    return this.persistStep(record, data, { updateAutoSave: false });
  }

  async autoSaveStep(data: AutoSaveAnamnesisStepInput): Promise<AnamnesisStep> {
    const record = this.records.get(data.anamnesisId);

    if (!record || record.tenantId !== data.tenantId) {
      throw AnamnesisErrorFactory.notFound();
    }

    const step = this.persistStep(record, data as SaveAnamnesisStepInput, { updateAutoSave: true });
    record.lastAutoSavedAt = data.autoSavedAt ? new Date(data.autoSavedAt) : new Date();
    return step;
  }

  async listByPatient(
    tenantId: string,
    patientId: string,
    filters?: AnamnesisListFilters,
  ): Promise<AnamnesisListItem[]> {
    const items = Array.from(this.records.values()).filter(
      (item) => item.tenantId === tenantId && item.patientId === patientId,
    );

    const filtered = items.filter((item) => {
      if (filters?.status && filters.status.length > 0 && !filters.status.includes(item.status)) {
        return false;
      }
      if (filters?.professionalId && item.professionalId !== filters.professionalId) {
        return false;
      }
      if (filters?.from && item.updatedAt < filters.from) {
        return false;
      }
      if (filters?.to && item.updatedAt > filters.to) {
        return false;
      }
      return true;
    });

    return filtered
      .map((item) => ({
        id: item.id,
        consultationId: item.consultationId,
        patientId: item.patientId,
        professionalId: item.professionalId,
        status: item.status,
        completionRate: item.completionRate,
        updatedAt: new Date(item.updatedAt),
      }))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async getHistoryByPatient(
    tenantId: string,
    patientId: string,
    filters?: AnamnesisHistoryFilters,
  ): Promise<AnamnesisHistoryEntry[]> {
    const limit = filters?.limit && filters.limit > 0 ? filters.limit : undefined;
    const includeDrafts = filters?.includeDrafts ?? false;
    const statuses = filters?.statuses ?? [];

    const entries = Array.from(this.records.values())
      .filter((item) => item.tenantId === tenantId && item.patientId === patientId)
      .filter((item) => {
        if (!includeDrafts && item.status === 'draft') {
          return false;
        }
        if (statuses.length > 0 && !statuses.includes(item.status)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const left = a.submittedAt ?? a.updatedAt;
        const right = b.submittedAt ?? b.updatedAt;
        return right.getTime() - left.getTime();
      })
      .slice(0, limit ?? undefined)
      .map((item) => ({
        id: item.id,
        consultationId: item.consultationId,
        professionalId: item.professionalId,
        status: item.status,
        completionRate: item.completionRate,
        submittedAt: item.submittedAt ? new Date(item.submittedAt) : undefined,
        updatedAt: new Date(item.updatedAt),
        steps: (item.steps ?? []).map((step) => ({
          stepNumber: step.stepNumber,
          key: step.key,
          payload: clonePayload(step.payload),
          completed: step.completed,
          hasErrors: step.hasErrors,
          validationScore: step.validationScore,
          updatedAt: new Date(step.updatedAt),
        })),
        attachments: (item.attachments ?? []).map((attachment) => ({
          ...attachment,
          uploadedAt: new Date(attachment.uploadedAt),
        })),
        latestPlan: item.latestPlan ? { ...item.latestPlan } : null,
      }));

    return entries;
  }

  async submit(data: SubmitAnamnesisInput): Promise<Anamnesis> {
    const record = this.records.get(data.anamnesisId);

    if (!record || record.tenantId !== data.tenantId) {
      throw AnamnesisErrorFactory.notFound();
    }

    record.status = 'submitted';
    record.isDraft = false;
    record.submittedAt = data.submissionDate;
    record.updatedAt = data.submissionDate;
    record.completionRate = data.completionRate;

    return this.cloneAnamnesis(record);
  }

  async saveTherapeuticPlan(data: SaveTherapeuticPlanInput): Promise<TherapeuticPlanData> {
    const record = this.records.get(data.anamnesisId);

    if (!record || record.tenantId !== data.tenantId) {
      throw AnamnesisErrorFactory.notFound();
    }

    const now = data.generatedAt ?? new Date();
    const plan: RepositoryPlan = {
      id: this.generateId('plan'),
      anamnesisId: record.id,
      analysisId: data.analysisId ?? null,
      clinicalReasoning: data.clinicalReasoning,
      summary: data.summary,
      therapeuticPlan: clonePayload(data.therapeuticPlan),
      riskFactors: clonePayload(data.riskFactors),
      recommendations: clonePayload(data.recommendations),
      confidence: data.confidence,
      reviewRequired: data.reviewRequired ?? false,
      approvalStatus: 'pending',
      generatedAt: now,
      createdAt: now,
      updatedAt: now,
      liked: undefined,
      feedbackComment: undefined,
      feedbackGivenAt: undefined,
      feedbackGivenBy: undefined,
    };

    record.latestPlan = plan;
    record.updatedAt = now;

    return { ...plan };
  }

  async savePlanFeedback(data: SavePlanFeedbackInput): Promise<TherapeuticPlanData> {
    const record = this.records.get(data.anamnesisId);

    if (!record || record.tenantId !== data.tenantId || !record.latestPlan) {
      throw AnamnesisErrorFactory.notFound();
    }

    const feedbackAt = data.feedbackGivenAt ?? new Date();

    record.latestPlan.approvalStatus = data.approvalStatus;
    record.latestPlan.liked = data.liked;
    record.latestPlan.feedbackComment = data.feedbackComment;
    record.latestPlan.feedbackGivenAt = feedbackAt;
    record.latestPlan.feedbackGivenBy = data.feedbackGivenBy;
    record.latestPlan.updatedAt = feedbackAt;

    await this.recordAITrainingFeedback({
      tenantId: data.tenantId,
      anamnesisId: data.anamnesisId,
      planId: record.latestPlan.id,
      analysisId: record.latestPlan.analysisId ?? null,
      approvalStatus: record.latestPlan.approvalStatus,
      liked: record.latestPlan.liked,
      feedbackComment: record.latestPlan.feedbackComment,
      feedbackGivenBy: record.latestPlan.feedbackGivenBy ?? data.feedbackGivenBy,
    });

    return { ...record.latestPlan };
  }

  async recordAITrainingFeedback(
    data: RecordAITrainingFeedbackInput,
  ): Promise<AnamnesisAITrainingFeedback> {
    const feedback: AnamnesisAITrainingFeedback = {
      id: this.generateId('feedback'),
      tenantId: data.tenantId,
      anamnesisId: data.anamnesisId,
      planId: data.planId,
      analysisId: data.analysisId ?? null,
      approvalStatus: data.approvalStatus,
      liked: data.liked,
      feedbackComment: data.feedbackComment,
      feedbackGivenBy: data.feedbackGivenBy,
      createdAt: new Date(),
    };

    this.trainingFeedbacks.push(feedback);

    return { ...feedback };
  }

  async createAttachment(data: CreateAnamnesisAttachmentInput): Promise<AnamnesisAttachment> {
    const record = this.records.get(data.anamnesisId);

    if (!record || record.tenantId !== data.tenantId) {
      throw AnamnesisErrorFactory.notFound();
    }

    const attachment: RepositoryAttachment = {
      id: this.generateId('attachment'),
      anamnesisId: record.id,
      stepNumber: data.stepNumber,
      fileName: data.fileName,
      mimeType: data.mimeType,
      size: data.size,
      storagePath: data.storagePath,
      uploadedBy: data.uploadedBy,
      uploadedAt: new Date(),
    };

    record.attachments = [...(record.attachments ?? []), attachment];
    record.updatedAt = new Date();

    return { ...attachment };
  }

  async removeAttachment(data: RemoveAnamnesisAttachmentInput): Promise<void> {
    const record = this.records.get(data.anamnesisId);

    if (!record || record.tenantId !== data.tenantId) {
      throw AnamnesisErrorFactory.notFound();
    }

    const attachments = record.attachments ?? [];
    const existing = attachments.find((item) => item.id === data.attachmentId);

    if (!existing) {
      throw AnamnesisErrorFactory.invalidState('Anexo informado nao pertence a esta anamnese');
    }

    record.attachments = attachments.filter((item) => item.id !== data.attachmentId);
    record.updatedAt = new Date();
  }

  async getStepTemplates(filters?: GetStepTemplatesFilters): Promise<AnamnesisStepTemplate[]> {
    const templates = Array.from(this.templates.values());
    if (filters?.tenantId) {
      return templates;
    }
    return templates;
  }

  async getStepTemplateByKey(
    key: AnamnesisStepKey,
    filters?: GetStepTemplatesFilters,
  ): Promise<AnamnesisStepTemplate | null> {
    const template = this.templates.get(key);
    if (!template) {
      return null;
    }
    if (filters?.tenantId) {
      return template;
    }
    return template;
  }

  async createAIAnalysis(data: CreateAnamnesisAIAnalysisInput): Promise<AnamnesisAIAnalysis> {
    const analysis: AnamnesisAIAnalysis = {
      id: this.generateId('analysis'),
      anamnesisId: data.anamnesisId,
      tenantId: data.tenantId,
      status: data.status,
      payload: clonePayload(data.payload),
      clinicalReasoning: undefined,
      summary: undefined,
      riskFactors: undefined,
      recommendations: undefined,
      confidence: undefined,
      generatedAt: new Date(),
      respondedAt: undefined,
      errorMessage: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.analyses.set(analysis.id, analysis);
    const record = this.records.get(data.anamnesisId);
    if (record) {
      record.aiAnalyses = [...(record.aiAnalyses ?? []), analysis];
    }

    return { ...analysis };
  }

  async completeAIAnalysis(data: CompleteAnamnesisAIAnalysisInput): Promise<AnamnesisAIAnalysis> {
    const analysis = this.analyses.get(data.analysisId);

    if (!analysis) {
      throw AnamnesisErrorFactory.notFound();
    }

    analysis.status = data.status;
    analysis.respondedAt = data.respondedAt ?? new Date();
    analysis.clinicalReasoning = data.clinicalReasoning;
    analysis.summary = data.summary;
    analysis.riskFactors = clonePayload(data.riskFactors);
    analysis.recommendations = clonePayload(data.recommendations);
    analysis.confidence = data.confidence;
    analysis.errorMessage = data.errorMessage;
    analysis.payload = clonePayload(data.payload ?? analysis.payload);
    analysis.updatedAt = new Date();

    return { ...analysis };
  }

  async getLatestAIAnalysis(
    tenantId: string,
    anamnesisId: string,
  ): Promise<AnamnesisAIAnalysis | null> {
    const record = this.records.get(anamnesisId);

    if (!record || record.tenantId !== tenantId) {
      return null;
    }

    const analyses = [...(record.aiAnalyses ?? [])].sort(
      (a, b) => (b.respondedAt ?? b.createdAt).getTime() - (a.respondedAt ?? a.createdAt).getTime(),
    );

    return analyses.length > 0 ? { ...analyses[0] } : null;
  }

  private persistStep(
    record: RepositoryAnamnesis,
    data: SaveAnamnesisStepInput,
    options: { updateAutoSave: boolean },
  ): AnamnesisStep {
    const now = new Date();
    const steps = record.steps ?? [];
    let step = steps.find((item) => item.stepNumber === data.stepNumber);

    if (!step) {
      step = {
        id: this.generateId('step'),
        anamnesisId: record.id,
        stepNumber: data.stepNumber,
        key: data.key,
        payload: clonePayload(data.payload ?? {}),
        completed: options.updateAutoSave ? false : (data.completed ?? false),
        hasErrors: data.hasErrors ?? false,
        validationScore: data.validationScore,
        createdAt: now,
        updatedAt: now,
      };
      steps.push(step);
    } else {
      step.key = data.key;
      step.payload = clonePayload(data.payload ?? step.payload ?? {});
      if (!options.updateAutoSave && data.completed !== undefined) {
        step.completed = data.completed;
      }
      if (data.hasErrors !== undefined) {
        step.hasErrors = data.hasErrors;
      }
      step.validationScore = data.validationScore;
      step.updatedAt = now;
    }

    if (data.currentStep !== undefined) {
      record.currentStep = data.currentStep;
    }

    if (typeof data.completionRate === 'number') {
      record.completionRate = data.completionRate;
    }

    record.steps = steps;
    record.updatedAt = now;

    return this.cloneStep(step);
  }

  private cloneAnamnesis(
    entity: RepositoryAnamnesis,
    options?: AnamnesisRepositoryFindOptions,
  ): Anamnesis {
    const includeSteps = options?.steps ?? true;
    const includeAttachments = options?.attachments ?? true;
    const includeLatestPlan = options?.latestPlan ?? true;
    const includeAnalyses = options?.aiAnalyses ?? false;

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
      lastAutoSavedAt: entity.lastAutoSavedAt ? new Date(entity.lastAutoSavedAt) : undefined,
      submittedAt: entity.submittedAt ? new Date(entity.submittedAt) : undefined,
      completedAt: entity.completedAt ? new Date(entity.completedAt) : undefined,
      createdAt: new Date(entity.createdAt),
      updatedAt: new Date(entity.updatedAt),
      steps: includeSteps ? entity.steps.map((step) => this.cloneStep(step)) : undefined,
      latestPlan: includeLatestPlan && entity.latestPlan ? { ...entity.latestPlan } : undefined,
      attachments: includeAttachments
        ? entity.attachments.map((attachment) => ({ ...attachment }))
        : undefined,
      aiAnalyses: includeAnalyses
        ? (entity.aiAnalyses ?? []).map((analysis) => ({ ...analysis }))
        : undefined,
    };
  }

  private cloneStep(step: AnamnesisStep): AnamnesisStep {
    return {
      ...step,
      payload: clonePayload(step.payload),
      updatedAt: new Date(step.updatedAt),
      createdAt: new Date(step.createdAt),
    };
  }

  private generateId(prefix: string): string {
    const value = `${prefix}-${this.sequence}`;
    this.sequence += 1;
    return value;
  }
}

const TENANT_ID = 'tenant-1';
const PATIENT_ID = '22222222-2222-2222-2222-222222222222';
const PROFESSIONAL_ID = '33333333-3333-3333-3333-333333333333';
const CONSULTATION_ID = '11111111-1111-1111-1111-111111111111';
const SECOND_CONSULTATION_ID = '44444444-4444-4444-4444-444444444444';

const buildIdentificationPayload = (fullName: string) => ({
  personalInfo: {
    fullName,
    birthDate: '1990-01-10',
    gender: 'female',
  },
  contactInfo: {
    phone: '11999999999',
  },
});

describe('AnamnesisModule (e2e)', () => {
  let app: INestApplication;
  let anamnesisId: string;

  const messageBus = new FakeMessageBus();
  const storageServiceMock = {
    upload: jest.fn(async ({ tenantId, anamnesisId, fileName, buffer, mimeType }) => ({
      storagePath: `storage/${tenantId}/${anamnesisId}/${fileName}`,
      size: buffer.byteLength,
      mimeType,
    })),
    delete: jest.fn(async () => undefined),
  } as unknown as jest.Mocked<IAnamnesisAttachmentStorageService>;

  const patientRepositoryMock = {
    findById: jest.fn(async (tenantId: string, patientId: string) => ({
      id: patientId,
      slug: `${patientId}-slug`,
      tenantId,
      professionalId: PROFESSIONAL_ID,
      fullName: 'Paciente E2E',
      shortName: 'Paciente',
      cpf: '12345678901',
      birthDate: new Date('1990-01-01T00:00:00Z'),
      gender: 'other',
      status: 'active',
      emailVerified: true,
      contact: { email: 'paciente@example.com', phone: '11999999999' },
      medical: {},
      acceptedTerms: true,
      acceptedTermsAt: new Date('2025-01-01T00:00:00Z'),
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-01T00:00:00Z'),
      archivedAt: undefined,
    })),
  } as unknown as jest.Mocked<IPatientRepository>;

  const authRepositoryMock = {
    findById: jest.fn(async (id: string) => ({
      id,
      slug: `${id}-slug`,
      supabaseId: `${id}-supabase`,
      email: 'pro@example.com',
      name: 'Profissional',
      cpf: '98765432100',
      phone: '11988888888',
      role: RolesEnum.PROFESSIONAL,
      tenantId: TENANT_ID,
      metadata: {},
      twoFactorEnabled: false,
      failedLoginAttempts: 0,
      isActive: true,
      emailVerified: true,
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-01T00:00:00Z'),
    })),
  } as unknown as jest.Mocked<IAuthRepository>;

  const currentUser: ICurrentUser = {
    id: PROFESSIONAL_ID,
    email: 'pro@example.com',
    name: 'Therapist',
    role: RolesEnum.PROFESSIONAL,
    tenantId: TENANT_ID,
    sessionId: 'session-1',
    metadata: {},
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AnamnesisController],
      providers: [
        { provide: ANAMNESIS_REPOSITORY_TOKEN, useClass: InMemoryAnamnesisRepository },
        { provide: MessageBus, useValue: messageBus },
        { provide: ConfigService, useValue: { get: jest.fn(() => 'secret') } },
        { provide: IAnamnesisAttachmentStorageServiceToken, useValue: storageServiceMock },
        { provide: IPatientRepositoryToken, useValue: patientRepositoryMock },
        { provide: IAuthRepositoryToken, useValue: authRepositoryMock },
        { provide: IStartAnamnesisUseCase, useClass: StartAnamnesisUseCase },
        { provide: IGetAnamnesisUseCase, useClass: GetAnamnesisUseCase },
        { provide: ISaveAnamnesisStepUseCase, useClass: SaveAnamnesisStepUseCase },
        { provide: IAutoSaveAnamnesisUseCase, useClass: AutoSaveAnamnesisUseCase },
        { provide: ISubmitAnamnesisUseCase, useClass: SubmitAnamnesisUseCase },
        { provide: IListAnamnesesByPatientUseCase, useClass: ListAnamnesesByPatientUseCase },
        { provide: IGetAnamnesisHistoryUseCase, useClass: GetAnamnesisHistoryUseCase },
        { provide: ISaveTherapeuticPlanUseCase, useClass: SaveTherapeuticPlanUseCase },
        { provide: ISavePlanFeedbackUseCase, useClass: SavePlanFeedbackUseCase },
        { provide: ICreateAnamnesisAttachmentUseCase, useClass: CreateAnamnesisAttachmentUseCase },
        { provide: IRemoveAnamnesisAttachmentUseCase, useClass: RemoveAnamnesisAttachmentUseCase },
        { provide: IReceiveAnamnesisAIResultUseCase, useClass: ReceiveAnamnesisAIResultUseCase },
        {
          provide: IListAnamnesisStepTemplatesUseCase,
          useClass: ListAnamnesisStepTemplatesUseCase,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const request = context.switchToHttp().getRequest();
          request.user = currentUser;
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TenantGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const request = context.switchToHttp().getRequest();
          if (!request.user) {
            request.user = currentUser;
          }
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(() => {
    storageServiceMock.upload.mockClear();
    storageServiceMock.delete.mockClear();
    messageBus.events.length = 0;
  });

  afterAll(async () => {
    await app.close();
  });

  it('inicia uma nova anamnese', async () => {
    const response = await request(app.getHttpServer())
      .post('/anamneses/start')
      .set('x-tenant-id', TENANT_ID)
      .send({
        consultationId: CONSULTATION_ID,
        patientId: PATIENT_ID,
        professionalId: PROFESSIONAL_ID,
        totalSteps: 4,
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.consultationId).toBe(CONSULTATION_ID);
    expect(response.body.totalSteps).toBe(4);

    anamnesisId = response.body.id;
  });

  it('reutiliza a anamnese existente quando start e chamado novamente', async () => {
    const response = await request(app.getHttpServer())
      .post('/anamneses/start')
      .set('x-tenant-id', TENANT_ID)
      .send({
        consultationId: CONSULTATION_ID,
        patientId: PATIENT_ID,
        professionalId: PROFESSIONAL_ID,
        totalSteps: 4,
      })
      .expect(201);

    expect(response.body.id).toBe(anamnesisId);
    expect(response.body.steps).toEqual([]);
  });

  it('salva um step e atualiza o progresso', async () => {
    const response = await request(app.getHttpServer())
      .put(`/anamneses/${anamnesisId}/steps/1`)
      .set('x-tenant-id', TENANT_ID)
      .send({
        key: 'identification',
        payload: buildIdentificationPayload('Paciente Teste Completo'),
        completed: true,
      })
      .expect(200);

    expect(response.body.currentStep).toBeGreaterThan(0);
    expect(response.body.completionRate).toBeGreaterThanOrEqual(25);
  });

  it('auto salva um step mantendo rascunho', async () => {
    const autoSavedAt = new Date('2025-09-27T11:00:00.000Z');

    const response = await request(app.getHttpServer())
      .post(`/anamneses/${anamnesisId}/auto-save`)
      .set('x-tenant-id', TENANT_ID)
      .send({
        stepNumber: 1,
        key: 'identification',
        payload: buildIdentificationPayload('Paciente Teste Auto Completo'),
        hasErrors: true,
        validationScore: 50,
        autoSavedAt: autoSavedAt.toISOString(),
      })
      .expect(200);

    expect(response.body.lastAutoSavedAt).toBeTruthy();
    const autoSaveEvent = messageBus.events.find(
      (event) => event.eventName === DomainEvents.ANAMNESIS_STEP_SAVED && event.payload.autoSave,
    );
    expect(autoSaveEvent).toBeDefined();
  });

  it('recupera os detalhes da anamnese com steps', async () => {
    const response = await request(app.getHttpServer())
      .get(
        `/anamneses/${anamnesisId}?includeSteps=true&includeLatestPlan=true&includeAttachments=true`,
      )
      .set('x-tenant-id', TENANT_ID)
      .expect(200);

    expect(response.body.id).toBe(anamnesisId);
    expect(response.body.steps).toHaveLength(1);
  });

  it('persiste o plano terapeutico e feedback', async () => {
    const planResponse = await request(app.getHttpServer())
      .post(`/anamneses/${anamnesisId}/plan`)
      .set('x-tenant-id', TENANT_ID)
      .send({
        clinicalReasoning: 'Resumo clinico',
        summary: 'Resumo',
        therapeuticPlan: { goals: ['Dormir melhor'] },
        riskFactors: [{ id: 'risk-1', description: 'Hipertensao', severity: 'high' }],
        recommendations: [{ id: 'rec-1', description: 'Exercicios leves', priority: 'medium' }],
        confidence: 0.8,
        reviewRequired: false,
        generatedAt: new Date('2025-09-26T03:00:00.000Z').toISOString(),
      })
      .expect(201);

    expect(planResponse.body.id).toBeDefined();
    expect(planResponse.body.riskFactors[0].id).toBe('risk-1');

    const feedbackResponse = await request(app.getHttpServer())
      .post(`/anamneses/${anamnesisId}/plan/feedback`)
      .set('x-tenant-id', TENANT_ID)
      .send({
        approvalStatus: 'approved',
        liked: true,
        feedbackComment: 'Plano excelente',
      })
      .expect(200);

    expect(feedbackResponse.body.approvalStatus).toBe('approved');
  });

  it('cadastra e remove anexos', async () => {
    const fileContent = Buffer.from('fake-pdf');

    const createResponse = await request(app.getHttpServer())
      .post(`/anamneses/${anamnesisId}/attachments`)
      .set('x-tenant-id', TENANT_ID)
      .field('stepNumber', '1')
      .field('fileName', 'exame.pdf')
      .attach('file', fileContent, { filename: 'exame.pdf', contentType: 'application/pdf' })
      .expect(201);

    expect(createResponse.body.fileName).toBe('exame.pdf');
    expect(storageServiceMock.upload).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT_ID,
        anamnesisId,
        fileName: 'exame.pdf',
        mimeType: 'application/pdf',
        buffer: expect.any(Buffer),
      }),
    );

    await request(app.getHttpServer())
      .delete(`/anamneses/${anamnesisId}/attachments/${createResponse.body.id}`)
      .set('x-tenant-id', TENANT_ID)
      .expect(204);

    expect(storageServiceMock.delete).toHaveBeenCalledWith(
      expect.objectContaining({ storagePath: expect.stringContaining(anamnesisId) }),
    );
  });

  it('submete a anamnese e gera eventos de IA', async () => {
    const response = await request(app.getHttpServer())
      .post(`/anamneses/${anamnesisId}/submit`)
      .set('x-tenant-id', TENANT_ID)
      .expect(200);

    expect(response.body.status).toBe('submitted');
    expect(response.body.completionRate).toBeGreaterThan(0);

    const submittedEvent = messageBus.events.find(
      (event) => event.eventName === DomainEvents.ANAMNESIS_SUBMITTED,
    );
    const aiRequestedEvent = messageBus.events.find(
      (event) => event.eventName === DomainEvents.ANAMNESIS_AI_REQUESTED,
    );

    expect(submittedEvent).toBeDefined();
    expect(aiRequestedEvent).toBeDefined();
  });

  it('lista as anamneses do paciente', async () => {
    const response = await request(app.getHttpServer())
      .get(`/anamneses/patient/${PATIENT_ID}?status=submitted`)
      .set('x-tenant-id', TENANT_ID)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body[0].id).toBe(anamnesisId);
    expect(response.body[0].status).toBe('submitted');
  });

  it('retorna historico com e sem drafts', async () => {
    const draftResponse = await request(app.getHttpServer())
      .post('/anamneses/start')
      .set('x-tenant-id', TENANT_ID)
      .send({
        consultationId: SECOND_CONSULTATION_ID,
        patientId: PATIENT_ID,
        professionalId: PROFESSIONAL_ID,
        totalSteps: 3,
      })
      .expect(201);

    const draftAnamnesisId = draftResponse.body.id;

    await request(app.getHttpServer())
      .post(`/anamneses/${draftAnamnesisId}/auto-save`)
      .set('x-tenant-id', TENANT_ID)
      .send({
        stepNumber: 1,
        key: 'identification',
        payload: buildIdentificationPayload('Paciente Draft Completo'),
      })
      .expect(200);

    const withoutDrafts = await request(app.getHttpServer())
      .get(`/anamneses/patient/${PATIENT_ID}/history?limit=1`)
      .set('x-tenant-id', TENANT_ID)
      .expect(200);

    expect(withoutDrafts.body.entries).toHaveLength(1);
    expect(withoutDrafts.body.entries[0].id).toBe(anamnesisId);

    const withDrafts = await request(app.getHttpServer())
      .get(`/anamneses/patient/${PATIENT_ID}/history?includeDrafts=true&limit=5`)
      .set('x-tenant-id', TENANT_ID)
      .expect(200);

    const draftEntry = withDrafts.body.entries.find((entry: any) => entry.id === draftAnamnesisId);
    expect(draftEntry).toBeDefined();
    expect(withDrafts.body.prefill.sourceAnamnesisId).toBe(anamnesisId);
  });
});
