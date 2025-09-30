import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { ConfigService } from '@nestjs/config';

import { AnamnesisController } from '@modules/anamnesis/api/controllers/anamnesis.controller';
import { AnamnesisAIWebhookGuard } from '@modules/anamnesis/guards/anamnesis-ai-webhook.guard';
import { RolesEnum } from '@domain/auth/enums/roles.enum';
import { ICurrentUser } from '@domain/auth/interfaces/current-user.interface';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { TenantGuard } from '@modules/auth/guards/tenant.guard';
import { IStartAnamnesisUseCase } from '@domain/anamnesis/interfaces/use-cases/start-anamnesis.use-case.interface';
import { IGetAnamnesisUseCase } from '@domain/anamnesis/interfaces/use-cases/get-anamnesis.use-case.interface';
import { ISaveAnamnesisStepUseCase } from '@domain/anamnesis/interfaces/use-cases/save-anamnesis-step.use-case.interface';
import { IAutoSaveAnamnesisUseCase } from '@domain/anamnesis/interfaces/use-cases/auto-save-anamnesis.use-case.interface';
import { ISubmitAnamnesisUseCase } from '@domain/anamnesis/interfaces/use-cases/submit-anamnesis.use-case.interface';
import { ICancelAnamnesisUseCase } from '@domain/anamnesis/interfaces/use-cases/cancel-anamnesis.use-case.interface';
import { IListAnamnesesByPatientUseCase } from '@domain/anamnesis/interfaces/use-cases/list-anamneses-by-patient.use-case.interface';
import { IGetAnamnesisHistoryUseCase } from '@domain/anamnesis/interfaces/use-cases/get-anamnesis-history.use-case.interface';
import { ISaveTherapeuticPlanUseCase } from '@domain/anamnesis/interfaces/use-cases/save-therapeutic-plan.use-case.interface';
import { ISavePlanFeedbackUseCase } from '@domain/anamnesis/interfaces/use-cases/save-plan-feedback.use-case.interface';
import { ICreateAnamnesisAttachmentUseCase } from '@domain/anamnesis/interfaces/use-cases/create-anamnesis-attachment.use-case.interface';
import { IRemoveAnamnesisAttachmentUseCase } from '@domain/anamnesis/interfaces/use-cases/remove-anamnesis-attachment.use-case.interface';
import { IReceiveAnamnesisAIResultUseCase } from '@domain/anamnesis/interfaces/use-cases/receive-anamnesis-ai-result.use-case.interface';
import { IListAnamnesisStepTemplatesUseCase } from '@domain/anamnesis/interfaces/use-cases/list-anamnesis-step-templates.use-case.interface';
import {
  Anamnesis,
  AnamnesisAIAnalysis,
  AnamnesisAttachment,
  AnamnesisHistoryData,
  AnamnesisListItem,
  AnamnesisStepTemplate,
  TherapeuticPlanData,
} from '@domain/anamnesis/types/anamnesis.types';
import { Result } from '@shared/types/result.type';

interface UseCaseMock<TInput, TOutput> {
  execute: jest.Mock<Promise<Result<TOutput>>, [TInput]>;
  executeOrThrow: jest.Mock<Promise<TOutput>, [TInput]>;
}

describe('AnamnesisController (integration)', () => {
  let app: INestApplication;

  const FIXTURE_IDS = {
    tenant: 'tenant-1',
    consultation: '11111111-1111-1111-1111-111111111111',
    patient: '22222222-2222-2222-2222-222222222222',
    professional: '33333333-3333-3333-3333-333333333333',
    anamnesis: '44444444-4444-4444-4444-444444444444',
    plan: '55555555-5555-5555-5555-555555555555',
    attachment: '66666666-6666-6666-6666-666666666666',
  } as const;

  const currentUser: ICurrentUser = {
    id: FIXTURE_IDS.professional,
    email: 'pro@example.com',
    name: 'Profissional',
    role: RolesEnum.PROFESSIONAL,
    tenantId: FIXTURE_IDS.tenant,
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

  const createUseCaseMock = <TInput, TOutput>(): UseCaseMock<TInput, TOutput> => {
    const execute = jest.fn<Promise<Result<TOutput>>, [TInput]>();
    const executeOrThrow = jest.fn<Promise<TOutput>, [TInput]>(async (input: TInput) => {
      const result = await execute(input);

      if (result?.error) {
        throw result.error;
      }

      return result?.data as TOutput;
    });

    return { execute, executeOrThrow };
  };

  const createAnamnesis = (overrides: Partial<Anamnesis> = {}): Anamnesis => ({
    id: overrides.id ?? FIXTURE_IDS.anamnesis,
    consultationId: overrides.consultationId ?? FIXTURE_IDS.consultation,
    patientId: overrides.patientId ?? FIXTURE_IDS.patient,
    professionalId: overrides.professionalId ?? FIXTURE_IDS.professional,
    tenantId: overrides.tenantId ?? FIXTURE_IDS.tenant,
    status: overrides.status ?? 'draft',
    totalSteps: overrides.totalSteps ?? 3,
    currentStep: overrides.currentStep ?? 1,
    completionRate: overrides.completionRate ?? 0,
    isDraft: overrides.isDraft ?? true,
    lastAutoSavedAt: overrides.lastAutoSavedAt,
    submittedAt: overrides.submittedAt,
    completedAt: overrides.completedAt,
    createdAt: overrides.createdAt ?? new Date('2025-09-26T00:00:00Z'),
    updatedAt: overrides.updatedAt ?? new Date('2025-09-26T00:00:00Z'),
    steps: overrides.steps ?? [],
    latestPlan: overrides.latestPlan ?? null,
    attachments: overrides.attachments ?? [],
    deletedAt: overrides.deletedAt,
    deletedBy: overrides.deletedBy,
    deletedReason: overrides.deletedReason,
  });

  const createPlan = (overrides: Partial<TherapeuticPlanData> = {}): TherapeuticPlanData => ({
    id: overrides.id ?? FIXTURE_IDS.plan,
    anamnesisId: overrides.anamnesisId ?? FIXTURE_IDS.anamnesis,
    clinicalReasoning: overrides.clinicalReasoning ?? 'Raciocinio',
    summary: overrides.summary ?? 'Resumo',
    therapeuticPlan: overrides.therapeuticPlan ?? {},
    riskFactors: overrides.riskFactors ?? [],
    recommendations: overrides.recommendations ?? [],
    confidence: overrides.confidence ?? 0.9,
    reviewRequired: overrides.reviewRequired ?? false,
    termsAccepted: overrides.termsAccepted ?? true,
    approvalStatus: overrides.approvalStatus ?? 'pending',
    liked: overrides.liked,
    feedbackComment: overrides.feedbackComment,
    feedbackGivenBy: overrides.feedbackGivenBy,
    feedbackGivenAt: overrides.feedbackGivenAt,
    generatedAt: overrides.generatedAt ?? new Date('2025-09-26T01:00:00Z'),
    createdAt: overrides.createdAt ?? new Date('2025-09-26T01:00:00Z'),
    updatedAt: overrides.updatedAt ?? new Date('2025-09-26T01:00:00Z'),
  });

  const createAIAnalysis = (overrides: Partial<AnamnesisAIAnalysis> = {}): AnamnesisAIAnalysis => ({
    id: overrides.id ?? 'analysis-1',
    anamnesisId: overrides.anamnesisId ?? FIXTURE_IDS.anamnesis,
    tenantId: overrides.tenantId ?? FIXTURE_IDS.tenant,
    status: overrides.status ?? 'pending',
    payload: overrides.payload ?? {},
    clinicalReasoning: overrides.clinicalReasoning,
    summary: overrides.summary,
    riskFactors: overrides.riskFactors,
    recommendations: overrides.recommendations,
    confidence: overrides.confidence,
    generatedAt: overrides.generatedAt ?? new Date('2025-09-26T02:00:00Z'),
    respondedAt: overrides.respondedAt,
    errorMessage: overrides.errorMessage,
    createdAt: overrides.createdAt ?? new Date('2025-09-26T02:00:00Z'),
    updatedAt: overrides.updatedAt ?? new Date('2025-09-26T02:00:00Z'),
  });

  const createAttachment = (overrides: Partial<AnamnesisAttachment> = {}): AnamnesisAttachment => ({
    id: overrides.id ?? FIXTURE_IDS.attachment,
    anamnesisId: overrides.anamnesisId ?? FIXTURE_IDS.anamnesis,
    stepNumber: overrides.stepNumber ?? 2,
    fileName: overrides.fileName ?? 'exame.pdf',
    mimeType: overrides.mimeType ?? 'application/pdf',
    size: overrides.size ?? 2048,
    storagePath: overrides.storagePath ?? 'path/exame.pdf',
    uploadedBy: overrides.uploadedBy ?? FIXTURE_IDS.professional,
    uploadedAt: overrides.uploadedAt ?? new Date('2025-09-26T02:00:00Z'),
  });

  const useCases = {
    start: createUseCaseMock<any, Anamnesis>(),
    detail: createUseCaseMock<any, Anamnesis>(),
    saveStep: createUseCaseMock<any, Anamnesis>(),
    autoSave: createUseCaseMock<any, Anamnesis>(),
    submit: createUseCaseMock<any, Anamnesis>(),
    cancel: createUseCaseMock<any, void>(),
    list: createUseCaseMock<any, AnamnesisListItem[]>(),
    history: createUseCaseMock<any, AnamnesisHistoryData>(),
    savePlan: createUseCaseMock<any, TherapeuticPlanData>(),
    feedback: createUseCaseMock<any, TherapeuticPlanData>(),
    createAttachment: createUseCaseMock<any, AnamnesisAttachment>(),
    removeAttachment: createUseCaseMock<any, void>(),
    receiveAiResult: createUseCaseMock<any, AnamnesisAIAnalysis>(),
    listTemplates: createUseCaseMock<any, AnamnesisStepTemplate[]>(),
  } as const;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AnamnesisController],
      providers: [
        { provide: IStartAnamnesisUseCase, useValue: useCases.start },
        { provide: IGetAnamnesisUseCase, useValue: useCases.detail },
        { provide: ISaveAnamnesisStepUseCase, useValue: useCases.saveStep },
        { provide: IAutoSaveAnamnesisUseCase, useValue: useCases.autoSave },
        { provide: ISubmitAnamnesisUseCase, useValue: useCases.submit },
        { provide: ICancelAnamnesisUseCase, useValue: useCases.cancel },
        { provide: IListAnamnesesByPatientUseCase, useValue: useCases.list },
        { provide: IGetAnamnesisHistoryUseCase, useValue: useCases.history },
        { provide: ISaveTherapeuticPlanUseCase, useValue: useCases.savePlan },
        { provide: ISavePlanFeedbackUseCase, useValue: useCases.feedback },
        { provide: ICreateAnamnesisAttachmentUseCase, useValue: useCases.createAttachment },
        { provide: IRemoveAnamnesisAttachmentUseCase, useValue: useCases.removeAttachment },
        { provide: IReceiveAnamnesisAIResultUseCase, useValue: useCases.receiveAiResult },
        { provide: IListAnamnesisStepTemplatesUseCase, useValue: useCases.listTemplates },
        { provide: ConfigService, useValue: { get: jest.fn(() => 'test-secret') } },
        { provide: AnamnesisAIWebhookGuard, useValue: { canActivate: () => true } },
      ],
    })
      .overrideGuard(AnamnesisAIWebhookGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(JwtAuthGuard)
      .useClass(guards.JwtAuthGuard as any)
      .overrideGuard(RolesGuard)
      .useClass(guards.RolesGuard as any)
      .overrideGuard(TenantGuard)
      .useClass(guards.TenantGuard as any)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();

    jest.clearAllMocks();
    useCases.listTemplates.execute.mockResolvedValue({ data: [] });
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /anamneses/start should start anamnesis', async () => {
    const anamnesis = createAnamnesis();
    useCases.start.execute.mockResolvedValue({ data: anamnesis });

    const response = await request(app.getHttpServer())
      .post('/anamneses/start')
      .set('x-tenant-id', FIXTURE_IDS.tenant)
      .send({
        consultationId: FIXTURE_IDS.consultation,
        patientId: FIXTURE_IDS.patient,
        professionalId: FIXTURE_IDS.professional,
        totalSteps: 5,
      })
      .expect(201);

    expect(useCases.start.execute).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: FIXTURE_IDS.tenant, totalSteps: 5 }),
    );
    expect(response.body.id).toBe(FIXTURE_IDS.anamnesis);
  });

  it('GET /anamneses/:id should return detail', async () => {
    const anamnesis = createAnamnesis();
    useCases.detail.execute.mockResolvedValue({ data: anamnesis });

    const response = await request(app.getHttpServer())
      .get(`/anamneses/${FIXTURE_IDS.anamnesis}?includeSteps=true`)
      .set('x-tenant-id', FIXTURE_IDS.tenant)
      .expect(200);

    expect(useCases.detail.execute).toHaveBeenCalledWith(
      expect.objectContaining({ includeSteps: true }),
    );
    expect(response.body.id).toBe(FIXTURE_IDS.anamnesis);
  });

  it('GET /anamneses/patient/:patientId should list anamneses', async () => {
    const items: AnamnesisListItem[] = [
      {
        id: FIXTURE_IDS.anamnesis,
        consultationId: FIXTURE_IDS.consultation,
        patientId: FIXTURE_IDS.patient,
        professionalId: FIXTURE_IDS.professional,
        status: 'draft',
        completionRate: 0,
        updatedAt: new Date('2025-09-26T00:00:00Z'),
      },
    ];
    useCases.list.execute.mockResolvedValue({ data: items });

    const response = await request(app.getHttpServer())
      .get(`/anamneses/patient/${FIXTURE_IDS.patient}?status=submitted`)
      .set('x-tenant-id', FIXTURE_IDS.tenant)
      .expect(200);

    expect(useCases.list.execute).toHaveBeenCalledWith(
      expect.objectContaining({ patientId: FIXTURE_IDS.patient }),
    );
    expect(response.body[0].id).toBe(FIXTURE_IDS.anamnesis);
  });

  it('GET /anamneses/patient/:patientId/history should return history', async () => {
    const historyData: AnamnesisHistoryData = {
      patientId: FIXTURE_IDS.patient,
      entries: [
        {
          id: 'hist-1',
          consultationId: FIXTURE_IDS.consultation,
          professionalId: FIXTURE_IDS.professional,
          status: 'submitted',
          completionRate: 100,
          submittedAt: new Date('2025-09-26T11:00:00Z'),
          updatedAt: new Date('2025-09-26T11:00:00Z'),
          steps: [
            {
              stepNumber: 1,
              key: 'identification',
              payload: { fullName: 'Paciente Historico' },
              completed: true,
              hasErrors: false,
              validationScore: 100,
              updatedAt: new Date('2025-09-26T11:00:00Z'),
            },
          ],
          attachments: [],
          latestPlan: null,
        },
      ],
      prefill: {
        steps: { identification: { fullName: 'Paciente Historico' } },
        attachments: [],
        sourceAnamnesisId: 'hist-1',
        updatedAt: new Date('2025-09-26T11:00:00Z'),
      },
    };

    useCases.history.execute.mockResolvedValue({ data: historyData });

    const response = await request(app.getHttpServer())
      .get(
        `/anamneses/patient/${FIXTURE_IDS.patient}/history?limit=1&status=submitted&includeDrafts=true`,
      )
      .set('x-tenant-id', FIXTURE_IDS.tenant)
      .expect(200);

    expect(useCases.history.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: FIXTURE_IDS.tenant,
        patientId: FIXTURE_IDS.patient,
        filters: expect.objectContaining({
          limit: 1,
          statuses: ['submitted'],
          includeDrafts: true,
        }),
      }),
    );
    expect(Array.isArray(response.body.entries)).toBe(true);
    expect(response.body.prefill.steps.identification.fullName).toBe('Paciente Historico');
  });

  it('PUT /anamneses/:id/steps/:stepNumber should save step', async () => {
    const anamnesis = createAnamnesis();
    useCases.saveStep.execute.mockResolvedValue({ data: anamnesis });

    await request(app.getHttpServer())
      .put(`/anamneses/${FIXTURE_IDS.anamnesis}/steps/2`)
      .set('x-tenant-id', FIXTURE_IDS.tenant)
      .send({ key: 'lifestyle', payload: { field: 'value' }, completed: true })
      .expect(200);

    expect(useCases.saveStep.execute).toHaveBeenCalledWith(
      expect.objectContaining({ stepNumber: 2, completed: true }),
    );
  });

  it('POST /anamneses/:id/auto-save should auto save step', async () => {
    const autoSavedAt = '2025-09-27T10:00:00.000Z';
    const anamnesis = createAnamnesis({
      lastAutoSavedAt: new Date(autoSavedAt),
    });
    useCases.autoSave.execute.mockResolvedValue({ data: anamnesis });

    const response = await request(app.getHttpServer())
      .post(`/anamneses/${FIXTURE_IDS.anamnesis}/auto-save`)
      .set('x-tenant-id', FIXTURE_IDS.tenant)
      .send({
        stepNumber: 2,
        key: 'lifestyle',
        payload: { field: 'value' },
        hasErrors: false,
        validationScore: 80,
        autoSavedAt,
      })
      .expect(200);

    expect(useCases.autoSave.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        anamnesisId: FIXTURE_IDS.anamnesis,
        stepNumber: 2,
        autoSavedAt: new Date(autoSavedAt),
      }),
    );
    expect(response.body.id).toBe(FIXTURE_IDS.anamnesis);
  });

  it('POST /anamneses/:id/submit should submit anamnesis', async () => {
    useCases.submit.execute.mockResolvedValue({ data: createAnamnesis({ status: 'submitted' }) });

    await request(app.getHttpServer())
      .post(`/anamneses/${FIXTURE_IDS.anamnesis}/submit`)
      .set('x-tenant-id', FIXTURE_IDS.tenant)
      .expect(200);

    expect(useCases.submit.execute).toHaveBeenCalled();
  });

  it('POST /anamneses/:id/cancel should cancelar anamnese', async () => {
    useCases.cancel.execute.mockResolvedValue({ data: undefined });

    await request(app.getHttpServer())
      .post(`/anamneses/${FIXTURE_IDS.anamnesis}/cancel`)
      .set('x-tenant-id', FIXTURE_IDS.tenant)
      .send({ reason: 'Paciente solicitou reagendamento' })
      .expect(204);

    expect(useCases.cancel.executeOrThrow).toHaveBeenCalledWith({
      tenantId: FIXTURE_IDS.tenant,
      anamnesisId: FIXTURE_IDS.anamnesis,
      requestedBy: FIXTURE_IDS.professional,
      requesterRole: RolesEnum.PROFESSIONAL,
      reason: 'Paciente solicitou reagendamento',
    });
  });

  it('POST /anamneses/:id/ai-result should receber resultado da IA', async () => {
    useCases.receiveAiResult.execute.mockResolvedValue({
      data: createAIAnalysis({ status: 'completed' }),
    });

    await request(app.getHttpServer())
      .post(`/anamneses/${FIXTURE_IDS.anamnesis}/ai-result`)
      .set('x-tenant-id', FIXTURE_IDS.tenant)
      .set('x-ai-secret', 'dummy')
      .send({
        analysisId: '11111111-2222-3333-4444-555555555555',
        status: 'completed',
        respondedAt: '2025-09-27T10:00:00.000Z',
        clinicalReasoning: 'Raciocinio IA',
      })
      .expect(202);

    expect(useCases.receiveAiResult.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        analysisId: '11111111-2222-3333-4444-555555555555',
        respondedAt: new Date('2025-09-27T10:00:00.000Z'),
      }),
    );
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
      termsAccepted: true,
      generatedAt: '2025-09-26T01:00:00.000Z',
    };

    const response = await request(app.getHttpServer())
      .post(`/anamneses/${FIXTURE_IDS.anamnesis}/plan`)
      .set('x-tenant-id', FIXTURE_IDS.tenant)
      .send(payload)
      .expect(201);

    expect(useCases.savePlan.execute).toHaveBeenCalledWith(
      expect.objectContaining({ confidence: 0.8, termsAccepted: true }),
    );
    expect(response.body.id).toBe(FIXTURE_IDS.plan);
    expect(response.body.termsAccepted).toBe(true);
  });

  it('POST /anamneses/:id/plan/feedback should persist feedback', async () => {
    const plan = createPlan({ approvalStatus: 'approved', liked: true });
    useCases.feedback.execute.mockResolvedValue({ data: plan });

    const response = await request(app.getHttpServer())
      .post(`/anamneses/${FIXTURE_IDS.anamnesis}/plan/feedback`)
      .set('x-tenant-id', FIXTURE_IDS.tenant)
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

    const fileContent = Buffer.from('fake-pdf');

    const response = await request(app.getHttpServer())
      .post(`/anamneses/${FIXTURE_IDS.anamnesis}/attachments`)
      .set('x-tenant-id', FIXTURE_IDS.tenant)
      .field('stepNumber', '2')
      .field('fileName', 'exame.pdf')
      .attach('file', fileContent, { filename: 'exame.pdf', contentType: 'application/pdf' })
      .expect(201);

    expect(useCases.createAttachment.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: FIXTURE_IDS.tenant,
        anamnesisId: FIXTURE_IDS.anamnesis,
        stepNumber: 2,
        fileName: 'exame.pdf',
        mimeType: 'application/pdf',
        size: fileContent.length,
        fileBuffer: expect.any(Buffer),
      }),
    );
    expect(response.body.id).toBe(FIXTURE_IDS.attachment);
  });

  it('DELETE /anamneses/:id/attachments/:attachmentId should remove attachment', async () => {
    useCases.removeAttachment.execute.mockResolvedValue({ data: undefined });

    await request(app.getHttpServer())
      .delete(`/anamneses/${FIXTURE_IDS.anamnesis}/attachments/${FIXTURE_IDS.attachment}`)
      .set('x-tenant-id', FIXTURE_IDS.tenant)
      .expect(204);

    expect(useCases.removeAttachment.execute).toHaveBeenCalledWith(
      expect.objectContaining({ attachmentId: FIXTURE_IDS.attachment }),
    );
  });
});
