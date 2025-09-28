import { AnamnesisPresenter } from '@modules/anamnesis/api/presenters/anamnesis.presenter';
import {
  Anamnesis,
  AnamnesisAttachment,
  AnamnesisListItem,
  AnamnesisStep,
  TherapeuticPlanData,
} from '@domain/anamnesis/types/anamnesis.types';

describe('AnamnesisPresenter', () => {
  const baseDate = new Date('2025-09-26T00:00:00Z');

  const buildStep = (payload: unknown): AnamnesisStep => ({
    id: 'step-1',
    anamnesisId: 'anamnesis-1',
    stepNumber: 1,
    key: 'identification',
    payload: payload as Record<string, unknown>,
    completed: true,
    hasErrors: false,
    validationScore: 95,
    updatedAt: baseDate,
    createdAt: baseDate,
  });

  const buildAttachment = (): AnamnesisAttachment => ({
    id: 'attachment-1',
    anamnesisId: 'anamnesis-1',
    stepNumber: 1,
    fileName: 'exame.pdf',
    mimeType: 'application/pdf',
    size: 123,
    storagePath: 'path/to/file',
    uploadedBy: 'user-1',
    uploadedAt: baseDate,
  });

  const buildHistoryStep = (payload: Record<string, unknown>): AnamnesisHistoryStep => ({
    stepNumber: 1,
    key: 'identification',
    payload,
    completed: true,
    hasErrors: false,
    validationScore: 90,
    updatedAt: baseDate,
  });

  const buildAnamnesis = (): Anamnesis => ({
    id: 'anamnesis-1',
    consultationId: 'consultation-1',
    patientId: 'patient-1',
    professionalId: 'professional-1',
    tenantId: 'tenant-1',
    status: 'draft',
    totalSteps: 3,
    currentStep: 2,
    completionRate: 50,
    isDraft: true,
    lastAutoSavedAt: baseDate,
    submittedAt: undefined,
    completedAt: undefined,
    createdAt: baseDate,
    updatedAt: baseDate,
    steps: [buildStep({ name: 'Paciente Teste', hobbies: ['natacao'] })],
    latestPlan: null,
    attachments: [buildAttachment()],
  });

  const buildPlan = (overrides: Partial<TherapeuticPlanData> = {}): TherapeuticPlanData => ({
    id: 'plan-1',
    anamnesisId: 'anamnesis-1',
    clinicalReasoning: 'Raciocinio',
    summary: 'Resumo',
    therapeuticPlan: { goals: ['Dormir melhor'] },
    riskFactors: [{ id: 'risk-1', description: 'Hipertensao', severity: 'high' }],
    recommendations: [{ id: 'rec-1', description: 'Alongamentos', priority: 'medium' }],
    confidence: 0.8,
    reviewRequired: undefined,
    approvalStatus: 'pending',
    liked: undefined,
    feedbackComment: undefined,
    feedbackGivenBy: undefined,
    feedbackGivenAt: undefined,
    generatedAt: baseDate,
    createdAt: baseDate,
    updatedAt: baseDate,
    ...overrides,
  });

  it('mapeia anamnese completa para DTO de detalhe', () => {
    const detail = AnamnesisPresenter.detail(buildAnamnesis());

    expect(detail.id).toBe('anamnesis-1');
    expect(detail.steps?.[0].payload).toEqual({ name: 'Paciente Teste', hobbies: ['natacao'] });
    expect(detail.attachments?.[0].fileName).toBe('exame.pdf');
  });

  it('normaliza plano terapeutico com arrays e valores padrao', () => {
    const dto = AnamnesisPresenter.plan(buildPlan());

    expect(dto.riskFactors?.[0]).toEqual({
      id: 'risk-1',
      description: 'Hipertensao',
      severity: 'high',
    });
    expect(dto.recommendations?.[0]).toEqual({
      id: 'rec-1',
      description: 'Alongamentos',
      priority: 'medium',
    });
    expect(dto.reviewRequired).toBe(false);
    expect(dto.therapeuticPlan).toEqual({ goals: ['Dormir melhor'] });
  });

  it('retorna objeto vazio quando therapeuticPlan nao e serializavel e preserva ausencia de listas', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;

    const dto = AnamnesisPresenter.plan(
      buildPlan({
        therapeuticPlan: cyclic,
        riskFactors: undefined,
        recommendations: undefined,
      }),
    );

    expect(dto.therapeuticPlan).toEqual({});
    expect(dto.riskFactors).toBeUndefined();
    expect(dto.recommendations).toBeUndefined();
  });

  it('mapeia latestPlan e omite colecoes ausentes', () => {
    const detail = AnamnesisPresenter.detail({
      ...buildAnamnesis(),
      steps: undefined,
      latestPlan: buildPlan(),
      attachments: undefined,
    });

    expect(detail.steps).toBeUndefined();
    expect(detail.latestPlan?.id).toBe('plan-1');
    expect(detail.attachments).toBeUndefined();
  });

  it('retorna objeto vazio quando therapeuticPlan nao e fornecido', () => {
    const dto = AnamnesisPresenter.plan(
      buildPlan({
        therapeuticPlan: undefined,
        riskFactors: undefined,
        recommendations: undefined,
      }),
    );

    expect(dto.therapeuticPlan).toEqual({});
  });

  it('garante fallback para datas ausentes', () => {
    const stepWithoutDates: AnamnesisStep = {
      ...buildStep({}),
      updatedAt: undefined as unknown as Date,
      createdAt: undefined as unknown as Date,
    };
    const attachmentWithoutDate: AnamnesisAttachment = {
      ...buildAttachment(),
      uploadedAt: undefined as unknown as Date,
    };
    const planWithMissingDates = buildPlan({
      generatedAt: undefined as unknown as Date,
      createdAt: undefined as unknown as Date,
      updatedAt: undefined as unknown as Date,
      feedbackGivenAt: undefined,
    });

    const detail = AnamnesisPresenter.detail({
      ...buildAnamnesis(),
      createdAt: undefined as unknown as Date,
      updatedAt: undefined as unknown as Date,
      steps: [stepWithoutDates],
      latestPlan: planWithMissingDates,
      attachments: [attachmentWithoutDate],
    });

    expect(detail.steps?.[0].updatedAt).toMatch(/T/);
    expect(detail.latestPlan?.generatedAt).toMatch(/T/);
    expect(detail.attachments?.[0].uploadedAt).toMatch(/T/);
  });

  it('mapeia itens de lista', () => {
    const items: AnamnesisListItem[] = [
      {
        id: 'anamnesis-1',
        consultationId: 'consultation-1',
        patientId: 'patient-1',
        professionalId: 'professional-1',
        status: 'draft',
        completionRate: 10,
        submittedAt: undefined,
        updatedAt: undefined as unknown as Date,
      },
    ];

    const dtoList = AnamnesisPresenter.list(items);

    expect(dtoList).toHaveLength(1);
    expect(dtoList[0].updatedAt).toMatch(/T/);
  });

  it('mapeia historico completo com prefill', () => {
    const historyInput: AnamnesisHistoryData = {
      patientId: 'patient-1',
      entries: [
        {
          id: 'history-1',
          consultationId: 'consultation-1',
          professionalId: 'professional-1',
          status: 'submitted',
          completionRate: 80,
          submittedAt: baseDate,
          updatedAt: baseDate,
          steps: [buildHistoryStep({ name: 'Historico' })],
          attachments: [buildAttachment()],
          latestPlan: buildPlan(),
        },
        {
          id: 'history-2',
          consultationId: 'consultation-2',
          professionalId: 'professional-2',
          status: 'draft',
          completionRate: 20,
          submittedAt: undefined,
          updatedAt: undefined as unknown as Date,
          steps: [
            {
              ...buildHistoryStep({ name: 'Rascunho' }),
              updatedAt: undefined as unknown as Date,
            },
          ],
          attachments: [],
          latestPlan: null,
        },
      ],
      prefill: {
        steps: { identification: { name: 'Prefill' } },
        attachments: [buildAttachment()],
        sourceAnamnesisId: 'history-1',
        updatedAt: baseDate,
      },
    };

    const dto = AnamnesisPresenter.history(historyInput);

    expect(dto.entries[0].latestPlan).not.toBeNull();
    expect(dto.entries[1].latestPlan).toBeNull();
    expect(dto.entries[1].updatedAt).toMatch(/T/);
    expect(dto.entries[1].steps[0].updatedAt).toMatch(/T/);
    expect(dto.prefill.steps.identification).toEqual({ name: 'Prefill' });
    expect(dto.prefill.attachments).toHaveLength(1);
    expect(dto.prefill.updatedAt).toBe(baseDate.toISOString());
  });

  it('mapeia templates de step', () => {
    const templates = [
      {
        id: 'template-1',
        key: 'identification',
        title: 'Identificacao',
        description: 'Dados basicos',
        version: 1,
        schema: { sections: [] },
        specialty: 'default',
        tenantId: 'tenant-1',
        isActive: true,
        createdAt: baseDate,
        updatedAt: baseDate,
      },
    ];

    const dto = AnamnesisPresenter.templates(templates as unknown as any);

    expect(dto).toHaveLength(1);
    expect(dto[0].key).toBe('identification');
    expect(dto[0].schema).toEqual({ sections: [] });
  });
  it('retorna schema vazio quando JSON serialization falha', () => {
    const circular: Record<string, unknown> = {};
    (circular as any).self = circular;

    const templates = [
      {
        id: 'template-2',
        key: 'chiefComplaint',
        title: 'Queixa',
        version: 1,
        schema: circular,
        specialty: null,
        isActive: true,
        tenantId: null,
        createdAt: null as unknown as Date,
        updatedAt: null as unknown as Date,
      },
    ];

    const dto = AnamnesisPresenter.templates(templates as unknown as any);

    expect(dto).toHaveLength(1);
    expect(dto[0].schema).toEqual({});
    expect(dto[0].specialty).toBeUndefined();
    expect(dto[0].createdAt).toMatch(/T/);
    expect(dto[0].updatedAt).toMatch(/T/);
  });
});
