import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AnamnesisController } from '@modules/anamnesis/api/controllers/anamnesis.controller';
import { RolesEnum } from '@domain/auth/enums/roles.enum';
import { ICurrentUser } from '@domain/auth/interfaces/current-user.interface';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { IStartAnamnesisUseCase } from '@domain/anamnesis/interfaces/use-cases/start-anamnesis.use-case.interface';
import { IGetAnamnesisUseCase } from '@domain/anamnesis/interfaces/use-cases/get-anamnesis.use-case.interface';
import { ISaveAnamnesisStepUseCase } from '@domain/anamnesis/interfaces/use-cases/save-anamnesis-step.use-case.interface';
import { ISubmitAnamnesisUseCase } from '@domain/anamnesis/interfaces/use-cases/submit-anamnesis.use-case.interface';
import { IListAnamnesesByPatientUseCase } from '@domain/anamnesis/interfaces/use-cases/list-anamneses-by-patient.use-case.interface';
import { ISaveTherapeuticPlanUseCase } from '@domain/anamnesis/interfaces/use-cases/save-therapeutic-plan.use-case.interface';
import { ISavePlanFeedbackUseCase } from '@domain/anamnesis/interfaces/use-cases/save-plan-feedback.use-case.interface';
import { ICreateAnamnesisAttachmentUseCase } from '@domain/anamnesis/interfaces/use-cases/create-anamnesis-attachment.use-case.interface';
import { IRemoveAnamnesisAttachmentUseCase } from '@domain/anamnesis/interfaces/use-cases/remove-anamnesis-attachment.use-case.interface';
import {
  Anamnesis,
  AnamnesisAttachment,
  AnamnesisListItem,
  TherapeuticPlanData,
} from '@domain/anamnesis/types/anamnesis.types';
import { Result } from '@shared/types/result.type';

interface UseCaseMock<TInput, TOutput> {
  execute: jest.Mock<Promise<Result<TOutput>>, [TInput]>;
}

describe('AnamnesisController (integration)', () => {
  let app: INestApplication;

  const currentUser: ICurrentUser = {
    id: 'user-1',
    email: 'pro@example.com',
    name: 'Profissional',
    role: RolesEnum.PROFESSIONAL,
    tenantId: 'tenant-1',
    sessionId: 'session-1',
    metadata: {},
  };

  const guards = {
    JwtAuthGuard: class implements Partial<JwtAuthGuard> {
      canActivate(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest();
        request.user = currentUser;
        return true;
      }
    },
    RolesGuard: class implements Partial<RolesGuard> {
      canActivate() {
        return true;
      }
    },
  } as Record<string, unknown>;

  const createUseCaseMock = <TInput, TOutput>(): UseCaseMock<TInput, TOutput> => ({
    execute: jest.fn(),
  });

  const createAnamnesis = (): Anamnesis => ({
    id: 'anamnesis-1',
    consultationId: 'consult-1',
    patientId: 'patient-1',
    professionalId: 'professional-1',
    tenantId: 'tenant-1',
    status: 'draft',
    totalSteps: 3,
    currentStep: 1,
    completionRate: 0,
    isDraft: true,
    createdAt: new Date('2025-09-26T00:00:00Z'),
    updatedAt: new Date('2025-09-26T00:00:00Z'),
    steps: [],
    latestPlan: null,
  });

  const createPlan = (): TherapeuticPlanData => ({
    id: 'plan-1',
    anamnesisId: 'anamnesis-1',
    clinicalReasoning: 'Raciocinio',
    summary: 'Resumo',
    therapeuticPlan: {},
    riskFactors: [],
    recommendations: [],
    confidence: 0.9,
    reviewRequired: false,
    approvalStatus: 'pending',
    liked: undefined,
    feedbackComment: undefined,
    feedbackGivenBy: undefined,
    feedbackGivenAt: undefined,
    generatedAt: new Date('2025-09-26T01:00:00Z'),
    createdAt: new Date('2025-09-26T01:00:00Z'),
    updatedAt: new Date('2025-09-26T01:00:00Z'),
  });

  const createAttachment = (): AnamnesisAttachment => ({
    id: 'attachment-1',
    anamnesisId: 'anamnesis-1',
    stepNumber: 2,
    fileName: 'exame.pdf',
    mimeType: 'application/pdf',
    size: 2048,
    storagePath: 'path/exame.pdf',
    uploadedBy: 'professional-1',
    uploadedAt: new Date('2025-09-26T02:00:00Z'),
  });

  const useCases = {
    start: createUseCaseMock<any, Anamnesis>(),
    detail: createUseCaseMock<any, Anamnesis>(),
    saveStep: createUseCaseMock<any, Anamnesis>(),
    submit: createUseCaseMock<any, Anamnesis>(),
    list: createUseCaseMock<any, AnamnesisListItem[]>(),
    savePlan: createUseCaseMock<any, TherapeuticPlanData>(),
    feedback: createUseCaseMock<any, TherapeuticPlanData>(),
    createAttachment: createUseCaseMock<any, AnamnesisAttachment>(),
    removeAttachment: createUseCaseMock<any, void>(),
  } as const;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AnamnesisController],
      providers: [
        { provide: IStartAnamnesisUseCase, useValue: useCases.start },
        { provide: IGetAnamnesisUseCase, useValue: useCases.detail },
        { provide: ISaveAnamnesisStepUseCase, useValue: useCases.saveStep },
        { provide: ISubmitAnamnesisUseCase, useValue: useCases.submit },
        { provide: IListAnamnesesByPatientUseCase, useValue: useCases.list },
        { provide: ISaveTherapeuticPlanUseCase, useValue: useCases.savePlan },
        { provide: ISavePlanFeedbackUseCase, useValue: useCases.feedback },
        { provide: ICreateAnamnesisAttachmentUseCase, useValue: useCases.createAttachment },
        { provide: IRemoveAnamnesisAttachmentUseCase, useValue: useCases.removeAttachment },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(guards.JwtAuthGuard as any)
      .overrideGuard(RolesGuard)
      .useClass(guards.RolesGuard as any)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();

    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /anamneses/start should start anamnesis', async () => {
    const anamnesis = createAnamnesis();
    useCases.start.execute.mockResolvedValue({ data: anamnesis });

    const response = await request(app.getHttpServer())
      .post('/anamneses/start')
      .set('x-tenant-id', 'tenant-1')
      .send({
        consultationId: 'consult-1',
        patientId: 'patient-1',
        professionalId: 'professional-1',
        totalSteps: 5,
      })
      .expect(201);

    expect(useCases.start.execute).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-1', totalSteps: 5 }),
    );
    expect(response.body.id).toBe('anamnesis-1');
  });

  it('GET /anamneses/:id should return detail', async () => {
    const anamnesis = createAnamnesis();
    useCases.detail.execute.mockResolvedValue({ data: anamnesis });

    const response = await request(app.getHttpServer())
      .get('/anamneses/anamnesis-1?includeSteps=true')
      .set('x-tenant-id', 'tenant-1')
      .expect(200);

    expect(useCases.detail.execute).toHaveBeenCalledWith(
      expect.objectContaining({ includeSteps: true }),
    );
    expect(response.body.id).toBe('anamnesis-1');
  });

  it('GET /anamneses/patient/:patientId should list anamneses', async () => {
    const items: AnamnesisListItem[] = [
      {
        id: 'anamnesis-1',
        consultationId: 'consult-1',
        patientId: 'patient-1',
        professionalId: 'professional-1',
        status: 'draft',
        completionRate: 0,
        updatedAt: new Date('2025-09-26T00:00:00Z'),
      },
    ];
    useCases.list.execute.mockResolvedValue({ data: items });

    const response = await request(app.getHttpServer())
      .get('/anamneses/patient/patient-1?status=submitted')
      .set('x-tenant-id', 'tenant-1')
      .expect(200);

    expect(useCases.list.execute).toHaveBeenCalledWith(
      expect.objectContaining({ patientId: 'patient-1' }),
    );
    expect(response.body[0].id).toBe('anamnesis-1');
  });

  it('PUT /anamneses/:id/steps/:stepNumber should save step', async () => {
    const anamnesis = createAnamnesis();
    useCases.saveStep.execute.mockResolvedValue({ data: anamnesis });

    await request(app.getHttpServer())
      .put('/anamneses/anamnesis-1/steps/2')
      .set('x-tenant-id', 'tenant-1')
      .send({ key: 'lifestyle', payload: { field: 'value' }, completed: true })
      .expect(200);

    expect(useCases.saveStep.execute).toHaveBeenCalledWith(
      expect.objectContaining({ stepNumber: 2, completed: true }),
    );
  });

  it('POST /anamneses/:id/submit should submit anamnesis', async () => {
    useCases.submit.execute.mockResolvedValue({ data: createAnamnesis({ status: 'submitted' }) });

    await request(app.getHttpServer())
      .post('/anamneses/anamnesis-1/submit')
      .set('x-tenant-id', 'tenant-1')
      .expect(200);

    expect(useCases.submit.execute).toHaveBeenCalled();
  });

  it('POST /anamneses/:id/plan should save plan', async () => {
    const plan = createPlan();
    useCases.savePlan.execute.mockResolvedValue({ data: plan });

    const payload = {
      clinicalReasoning: 'Raciocinio',
      summary: 'Resumo',
      therapeuticPlan: {},
      riskFactors: [{ id: 'risk-1', description: 'Fator', severity: 'high' }],
      recommendations: [{ id: 'rec-1', description: 'Recomendacao', priority: 'medium' }],
      confidence: 0.8,
      reviewRequired: false,
      generatedAt: '2025-09-26T01:00:00.000Z',
    };

    const response = await request(app.getHttpServer())
      .post('/anamneses/anamnesis-1/plan')
      .set('x-tenant-id', 'tenant-1')
      .send(payload)
      .expect(201);

    expect(useCases.savePlan.execute).toHaveBeenCalledWith(
      expect.objectContaining({ confidence: 0.8 }),
    );
    expect(response.body.id).toBe('plan-1');
  });

  it('POST /anamneses/:id/plan/feedback should persist feedback', async () => {
    const plan = createPlan({ approvalStatus: 'approved', liked: true });
    useCases.feedback.execute.mockResolvedValue({ data: plan });

    const response = await request(app.getHttpServer())
      .post('/anamneses/anamnesis-1/plan/feedback')
      .set('x-tenant-id', 'tenant-1')
      .send({ approvalStatus: 'approved', liked: true })
      .expect(200);

    expect(useCases.feedback.execute).toHaveBeenCalledWith(
      expect.objectContaining({ approvalStatus: 'approved' }),
    );
    expect(response.body.approvalStatus).toBe('approved');
  });

  it('POST /anamneses/:id/attachments should create attachment', async () => {
    const attachment = createAttachment();
    useCases.createAttachment.execute.mockResolvedValue({ data: attachment });

    const response = await request(app.getHttpServer())
      .post('/anamneses/anamnesis-1/attachments')
      .set('x-tenant-id', 'tenant-1')
      .send({
        stepNumber: 2,
        fileName: 'exame.pdf',
        mimeType: 'application/pdf',
        size: 2048,
        storagePath: 'path/exame.pdf',
      })
      .expect(201);

    expect(useCases.createAttachment.execute).toHaveBeenCalled();
    expect(response.body.id).toBe('attachment-1');
  });

  it('DELETE /anamneses/:id/attachments/:attachmentId should remove attachment', async () => {
    useCases.removeAttachment.execute.mockResolvedValue({ data: undefined });

    await request(app.getHttpServer())
      .delete('/anamneses/anamnesis-1/attachments/attachment-1')
      .set('x-tenant-id', 'tenant-1')
      .expect(204);

    expect(useCases.removeAttachment.execute).toHaveBeenCalledWith(
      expect.objectContaining({ attachmentId: 'attachment-1' }),
    );
  });
});
