import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AnamnesisController } from '@modules/anamnesis/api/controllers/anamnesis.controller';
import { RolesEnum } from '@domain/auth/enums/roles.enum';
import { ICurrentUser } from '@domain/auth/interfaces/current-user.interface';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import {
  IAnamnesisRepository,
  IAnamnesisRepositoryToken,
} from '@domain/anamnesis/interfaces/repositories/anamnesis.repository.interface';
import {
  Anamnesis,
  AnamnesisAttachment,
  AnamnesisListFilters,
  AnamnesisListItem,
  AnamnesisRepositoryFindOptions,
  AnamnesisStep,
  CreateAnamnesisAttachmentInput,
  CreateAnamnesisInput,
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
import { ISubmitAnamnesisUseCase } from '@domain/anamnesis/interfaces/use-cases/submit-anamnesis.use-case.interface';
import { IListAnamnesesByPatientUseCase } from '@domain/anamnesis/interfaces/use-cases/list-anamneses-by-patient.use-case.interface';
import { ISaveTherapeuticPlanUseCase } from '@domain/anamnesis/interfaces/use-cases/save-therapeutic-plan.use-case.interface';
import { ISavePlanFeedbackUseCase } from '@domain/anamnesis/interfaces/use-cases/save-plan-feedback.use-case.interface';
import { ICreateAnamnesisAttachmentUseCase } from '@domain/anamnesis/interfaces/use-cases/create-anamnesis-attachment.use-case.interface';
import { IRemoveAnamnesisAttachmentUseCase } from '@domain/anamnesis/interfaces/use-cases/remove-anamnesis-attachment.use-case.interface';
import { StartAnamnesisUseCase } from '@modules/anamnesis/use-cases/start-anamnesis.use-case';
import { GetAnamnesisUseCase } from '@modules/anamnesis/use-cases/get-anamnesis.use-case';
import { SaveAnamnesisStepUseCase } from '@modules/anamnesis/use-cases/save-anamnesis-step.use-case';
import { SubmitAnamnesisUseCase } from '@modules/anamnesis/use-cases/submit-anamnesis.use-case';
import { ListAnamnesesByPatientUseCase } from '@modules/anamnesis/use-cases/list-anamneses-by-patient.use-case';
import { SaveTherapeuticPlanUseCase } from '@modules/anamnesis/use-cases/save-therapeutic-plan.use-case';
import { SavePlanFeedbackUseCase } from '@modules/anamnesis/use-cases/save-plan-feedback.use-case';
import { CreateAnamnesisAttachmentUseCase } from '@modules/anamnesis/use-cases/create-anamnesis-attachment.use-case';
import { RemoveAnamnesisAttachmentUseCase } from '@modules/anamnesis/use-cases/remove-anamnesis-attachment.use-case';
import { MessageBus } from '@shared/messaging/message-bus';
import { DomainEvent } from '@shared/events/domain-event.interface';
import { AnamnesisErrorFactory } from '@shared/factories/anamnesis-error.factory';

class FakeMessageBus {
  public readonly events: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    this.events.push(event);
  }

  async publishMany(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  subscribe(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  unsubscribe(): void {}
}

class InMemoryAnamnesisRepository implements IAnamnesisRepository {
  private readonly records = new Map<string, Anamnesis>();

  private sequence = 1;

  async create(data: CreateAnamnesisInput): Promise<Anamnesis> {
    const now = new Date();
    const record: Anamnesis = {
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

    const now = new Date();
    const steps = record.steps ?? [];
    let step = steps.find((item) => item.stepNumber === data.stepNumber);

    if (!step) {
      step = {
        id: this.generateId('step'),
        anamnesisId: record.id,
        stepNumber: data.stepNumber,
        key: data.key,
        payload: JSON.parse(JSON.stringify(data.payload ?? {})),
        completed: data.completed ?? false,
        hasErrors: data.hasErrors ?? false,
        validationScore: data.validationScore,
        updatedAt: now,
        createdAt: now,
      };
      steps.push(step);
    } else {
      step.key = data.key;
      step.payload = JSON.parse(JSON.stringify(data.payload ?? {}));
      step.completed = data.completed ?? step.completed;
      step.hasErrors = data.hasErrors ?? step.hasErrors;
      step.validationScore = data.validationScore;
      step.updatedAt = now;
    }

    record.steps = steps;
    if (typeof data.currentStep === 'number') {
      record.currentStep = data.currentStep;
    }
    if (typeof data.completionRate === 'number') {
      record.completionRate = data.completionRate;
    }
    record.updatedAt = now;

    return this.cloneStep(step);
  }

  async listByPatient(
    tenantId: string,
    patientId: string,
    filters?: AnamnesisListFilters,
  ): Promise<AnamnesisListItem[]> {
    const collection = Array.from(this.records.values()).filter(
      (item) => item.tenantId === tenantId && item.patientId === patientId,
    );

    const filtered = collection.filter((item) => {
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

    return filtered.map((item) => ({
      id: item.id,
      consultationId: item.consultationId,
      patientId: item.patientId,
      professionalId: item.professionalId,
      status: item.status,
      completionRate: item.completionRate,
      submittedAt: item.submittedAt ? new Date(item.submittedAt) : undefined,
      updatedAt: new Date(item.updatedAt),
    }));
  }

  async submit(data: SubmitAnamnesisInput): Promise<Anamnesis> {
    const record = this.records.get(data.anamnesisId);

    if (!record || record.tenantId !== data.tenantId) {
      throw AnamnesisErrorFactory.notFound();
    }

    record.status = 'submitted';
    record.isDraft = false;
    record.submittedAt = data.submissionDate;
    record.completionRate = data.completionRate;
    record.updatedAt = new Date();

    return this.cloneAnamnesis(record);
  }

  async saveTherapeuticPlan(data: SaveTherapeuticPlanInput): Promise<TherapeuticPlanData> {
    const record = this.records.get(data.anamnesisId);

    if (!record || record.tenantId !== data.tenantId) {
      throw AnamnesisErrorFactory.notFound();
    }

    const now = new Date();
    const existing = record.latestPlan;

    const plan: TherapeuticPlanData = existing
      ? { ...existing }
      : {
          id: this.generateId('plan'),
          anamnesisId: record.id,
          approvalStatus: 'pending',
          generatedAt: data.generatedAt,
          createdAt: now,
          updatedAt: now,
        };

    plan.clinicalReasoning = data.clinicalReasoning;
    plan.summary = data.summary;
    plan.therapeuticPlan = data.therapeuticPlan
      ? JSON.parse(JSON.stringify(data.therapeuticPlan))
      : undefined;
    plan.riskFactors = data.riskFactors ? data.riskFactors.map((item) => ({ ...item })) : undefined;
    plan.recommendations = data.recommendations
      ? data.recommendations.map((item) => ({ ...item }))
      : undefined;
    plan.confidence = data.confidence;
    plan.reviewRequired = data.reviewRequired ?? false;
    plan.generatedAt = data.generatedAt;
    plan.updatedAt = now;

    if (!existing) {
      plan.createdAt = now;
    }

    record.latestPlan = plan;
    record.updatedAt = now;

    return this.clonePlan(plan);
  }

  async savePlanFeedback(data: SavePlanFeedbackInput): Promise<TherapeuticPlanData> {
    const record = this.records.get(data.anamnesisId);

    if (!record || record.tenantId !== data.tenantId) {
      throw AnamnesisErrorFactory.notFound();
    }

    const plan = record.latestPlan;

    if (!plan) {
      throw AnamnesisErrorFactory.invalidState('Plano terapeutico nao encontrado');
    }

    const now = new Date();
    plan.approvalStatus = data.approvalStatus;
    plan.liked = data.liked;
    plan.feedbackComment = data.feedbackComment;
    plan.feedbackGivenBy = data.feedbackGivenBy;
    plan.feedbackGivenAt = data.feedbackGivenAt;
    plan.updatedAt = now;

    record.latestPlan = plan;
    record.updatedAt = now;

    return this.clonePlan(plan);
  }

  async createAttachment(data: CreateAnamnesisAttachmentInput): Promise<AnamnesisAttachment> {
    const record = this.records.get(data.anamnesisId);

    if (!record || record.tenantId !== data.tenantId) {
      throw AnamnesisErrorFactory.notFound();
    }

    const attachment: AnamnesisAttachment = {
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

    return this.cloneAttachment(attachment);
  }

  async removeAttachment(data: RemoveAnamnesisAttachmentInput): Promise<void> {
    const record = this.records.get(data.anamnesisId);

    if (!record || record.tenantId !== data.tenantId) {
      throw AnamnesisErrorFactory.notFound();
    }

    const attachments = record.attachments ?? [];
    const initialCount = attachments.length;
    record.attachments = attachments.filter((item) => item.id !== data.attachmentId);

    if (record.attachments.length === initialCount) {
      throw AnamnesisErrorFactory.invalidState('Anexo informado nao pertence a esta anamnese');
    }

    record.updatedAt = new Date();
  }

  private cloneAnamnesis(entity: Anamnesis, options?: AnamnesisRepositoryFindOptions): Anamnesis {
    const includeSteps = options?.steps ?? true;
    const includeLatestPlan = options?.latestPlan ?? true;
    const includeAttachments = options?.attachments ?? true;

    return {
      ...entity,
      lastAutoSavedAt: entity.lastAutoSavedAt ? new Date(entity.lastAutoSavedAt) : undefined,
      submittedAt: entity.submittedAt ? new Date(entity.submittedAt) : undefined,
      completedAt: entity.completedAt ? new Date(entity.completedAt) : undefined,
      createdAt: new Date(entity.createdAt),
      updatedAt: new Date(entity.updatedAt),
      steps: includeSteps ? (entity.steps ?? []).map((step) => this.cloneStep(step)) : undefined,
      latestPlan: includeLatestPlan
        ? entity.latestPlan
          ? this.clonePlan(entity.latestPlan)
          : null
        : undefined,
      attachments: includeAttachments
        ? (entity.attachments ?? []).map((attachment) => this.cloneAttachment(attachment))
        : undefined,
    };
  }

  private cloneStep(step: AnamnesisStep): AnamnesisStep {
    return {
      ...step,
      payload: JSON.parse(JSON.stringify(step.payload ?? {})),
      updatedAt: new Date(step.updatedAt),
      createdAt: new Date(step.createdAt),
    };
  }

  private clonePlan(plan: TherapeuticPlanData): TherapeuticPlanData {
    return {
      ...plan,
      therapeuticPlan: plan.therapeuticPlan
        ? JSON.parse(JSON.stringify(plan.therapeuticPlan))
        : undefined,
      riskFactors: plan.riskFactors ? plan.riskFactors.map((item) => ({ ...item })) : undefined,
      recommendations: plan.recommendations
        ? plan.recommendations.map((item) => ({ ...item }))
        : undefined,
      generatedAt: new Date(plan.generatedAt),
      createdAt: new Date(plan.createdAt),
      updatedAt: new Date(plan.updatedAt),
      feedbackGivenAt: plan.feedbackGivenAt ? new Date(plan.feedbackGivenAt) : undefined,
    };
  }

  private cloneAttachment(attachment: AnamnesisAttachment): AnamnesisAttachment {
    return {
      ...attachment,
      uploadedAt: new Date(attachment.uploadedAt),
    };
  }

  private generateId(prefix: string): string {
    const value = `${prefix}-${this.sequence}`;
    this.sequence += 1;
    return value;
  }
}

const TENANT_ID = 'tenant-1';
const PATIENT_ID = 'patient-1';
const PROFESSIONAL_ID = 'professional-1';
const CONSULTATION_ID = 'consultation-1';

describe('AnamnesisModule (e2e)', () => {
  let app: INestApplication;
  let anamnesisId: string;

  const messageBus = new FakeMessageBus();

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
        { provide: IAnamnesisRepositoryToken, useClass: InMemoryAnamnesisRepository },
        { provide: MessageBus, useValue: messageBus },
        { provide: IStartAnamnesisUseCase, useClass: StartAnamnesisUseCase },
        { provide: IGetAnamnesisUseCase, useClass: GetAnamnesisUseCase },
        { provide: ISaveAnamnesisStepUseCase, useClass: SaveAnamnesisStepUseCase },
        { provide: ISubmitAnamnesisUseCase, useClass: SubmitAnamnesisUseCase },
        { provide: IListAnamnesesByPatientUseCase, useClass: ListAnamnesesByPatientUseCase },
        { provide: ISaveTherapeuticPlanUseCase, useClass: SaveTherapeuticPlanUseCase },
        { provide: ISavePlanFeedbackUseCase, useClass: SavePlanFeedbackUseCase },
        { provide: ICreateAnamnesisAttachmentUseCase, useClass: CreateAnamnesisAttachmentUseCase },
        { provide: IRemoveAnamnesisAttachmentUseCase, useClass: RemoveAnamnesisAttachmentUseCase },
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
      .useValue({
        canActivate: () => true,
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
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
        payload: { fullName: 'Paciente Teste' },
        completed: true,
      })
      .expect(200);

    expect(response.body.currentStep).toBeGreaterThan(0);
    expect(response.body.completionRate).toBeGreaterThanOrEqual(25);
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
    expect(feedbackResponse.body.liked).toBe(true);
  });

  it('cadastra e remove anexos', async () => {
    const createResponse = await request(app.getHttpServer())
      .post(`/anamneses/${anamnesisId}/attachments`)
      .set('x-tenant-id', TENANT_ID)
      .send({
        stepNumber: 1,
        fileName: 'exame.pdf',
        mimeType: 'application/pdf',
        size: 5120,
        storagePath: 'anamneses/exames/exame.pdf',
      })
      .expect(201);

    expect(createResponse.body.fileName).toBe('exame.pdf');

    await request(app.getHttpServer())
      .delete(`/anamneses/${anamnesisId}/attachments/${createResponse.body.id}`)
      .set('x-tenant-id', TENANT_ID)
      .expect(204);
  });

  it('submete a anamnese e calcula o completion rate', async () => {
    const response = await request(app.getHttpServer())
      .post(`/anamneses/${anamnesisId}/submit`)
      .set('x-tenant-id', TENANT_ID)
      .expect(200);

    expect(response.body.status).toBe('submitted');
    expect(response.body.completionRate).toBeGreaterThan(0);
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
});
