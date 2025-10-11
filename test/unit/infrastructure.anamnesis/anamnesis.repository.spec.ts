import { DataSource } from 'typeorm';

import { AnamnesisRepository } from '@infrastructure/anamnesis/repositories/anamnesis.repository';
import { AnamnesisEntity } from '@infrastructure/anamnesis/entities/anamnesis.entity';
import { AnamnesisStepEntity } from '@infrastructure/anamnesis/entities/anamnesis-step.entity';
import { AnamnesisTherapeuticPlanEntity } from '@infrastructure/anamnesis/entities/anamnesis-therapeutic-plan.entity';
import { AnamnesisAttachmentEntity } from '@infrastructure/anamnesis/entities/anamnesis-attachment.entity';
import { AnamnesisStepTemplateEntity } from '@infrastructure/anamnesis/entities/anamnesis-step-template.entity';
import { AnamnesisAIAnalysisEntity } from '@infrastructure/anamnesis/entities/anamnesis-ai-analysis.entity';
import { AnamnesisAITrainingFeedbackEntity } from '@infrastructure/anamnesis/entities/anamnesis-ai-feedback.entity';

const createStepEntity = (overrides: Partial<AnamnesisStepEntity> = {}): AnamnesisStepEntity =>
  ({
    id: overrides.id ?? 'step-id',
    anamnesisId: overrides.anamnesisId ?? 'anamnesis-auto-save',
    stepNumber: overrides.stepNumber ?? 2,
    key: overrides.key ?? 'lifestyle',
    payload: overrides.payload ?? { existing: true },
    completed: overrides.completed ?? false,
    hasErrors: overrides.hasErrors ?? false,
    validationScore: overrides.validationScore,
    createdAt: overrides.createdAt ?? new Date('2025-09-26T09:50:00.000Z'),
    updatedAt: overrides.updatedAt ?? new Date('2025-09-26T10:00:00.000Z'),
  }) as unknown as AnamnesisStepEntity;

const createTemplateEntity = (
  overrides: Partial<AnamnesisStepTemplateEntity> = {},
): AnamnesisStepTemplateEntity =>
  ({
    id: overrides.id ?? 'template-id',
    key: overrides.key ?? 'lifestyle',
    title: overrides.title ?? 'Template',
    description: overrides.description,
    schema: overrides.schema ?? {},
    version: overrides.version ?? 1,
    specialty: overrides.specialty,
    tenantId: overrides.tenantId ?? null,
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? new Date('2025-09-26T00:00:00.000Z'),
    updatedAt: overrides.updatedAt ?? new Date('2025-09-26T00:00:00.000Z'),
  }) as unknown as AnamnesisStepTemplateEntity;

describe('AnamnesisRepository.autoSaveStep', () => {
  const tenantId = 'tenant-auto-save';
  const anamnesisId = 'anamnesis-auto-save';

  const createRepository = () => {
    const anamnesisRepoMock = {
      update: jest.fn(),
    };

    const queryBuilderMock = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    };

    const stepRepoMock = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilderMock),
    };

    const planRepoMock = {};
    const attachmentRepoMock = {};
    const stepTemplateRepoMock = {};
    const aiAnalysisRepoMock = {};
    const aiFeedbackRepoMock = {
      create: jest.fn((entity) => ({ ...entity })),
      save: jest.fn(async (entity) => ({
        ...entity,
        id: entity.id ?? 'feedback-1',
        createdAt: new Date('2025-09-26T12:00:00.000Z'),
      })),
    };

    const getRepository = jest.fn((entity: unknown) => {
      if (entity === AnamnesisEntity) {
        return anamnesisRepoMock;
      }
      if (entity === AnamnesisStepEntity) {
        return stepRepoMock;
      }
      if (entity === AnamnesisTherapeuticPlanEntity) {
        return planRepoMock;
      }
      if (entity === AnamnesisAttachmentEntity) {
        return attachmentRepoMock;
      }
      if (entity === AnamnesisStepTemplateEntity) {
        return stepTemplateRepoMock;
      }
      if (entity === AnamnesisAIAnalysisEntity) {
        return aiAnalysisRepoMock;
      }
      if (entity === AnamnesisAITrainingFeedbackEntity) {
        return aiFeedbackRepoMock;
      }
      return {};
    });

    const dataSource = { getRepository } as unknown as DataSource;
    const repository = new AnamnesisRepository(dataSource);

    return {
      repository,
      anamnesisRepoMock,
      stepRepoMock,
      queryBuilderMock,
      aiFeedbackRepoMock,
    };
  };

  it('merges payload with existing step and updates timestamps', async () => {
    const { repository, anamnesisRepoMock, stepRepoMock, queryBuilderMock } = createRepository();

    const existingStep = createStepEntity();
    stepRepoMock.findOne.mockResolvedValue(existingStep);

    stepRepoMock.save.mockImplementation(async (entity: AnamnesisStepEntity) => ({
      ...existingStep,
      ...entity,
      id: existingStep.id,
      updatedAt: new Date('2025-09-26T10:04:00.000Z'),
    }));

    const autoSavedAt = new Date('2025-09-26T10:05:00.000Z');
    const result = await repository.autoSaveStep({
      anamnesisId,
      tenantId,
      stepNumber: 2,
      key: 'lifestyle',
      payload: { extra: 'value', nested: { field: 'data' } },
      hasErrors: true,
      validationScore: 90,
      autoSavedAt,
    });

    expect(result.payload).toEqual({
      existing: true,
      extra: 'value',
      nested: { field: 'data' },
    });
    expect(result.hasErrors).toBe(true);
    expect(result.validationScore).toBe(90);
    expect(result.updatedAt.toISOString()).toBe(autoSavedAt.toISOString());

    expect(stepRepoMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ existing: true, extra: 'value' }),
      }),
    );
    expect(queryBuilderMock.set).toHaveBeenCalledWith({ updatedAt: autoSavedAt });
    expect(anamnesisRepoMock.update).toHaveBeenCalledWith(
      { id: anamnesisId, tenantId },
      { lastAutoSavedAt: autoSavedAt, updatedAt: autoSavedAt },
    );
  });

  it('ignores stale payloads using autoSavedAt chronology', async () => {
    const { repository, anamnesisRepoMock, stepRepoMock } = createRepository();

    const recentTimestamp = new Date('2025-09-26T11:00:00.000Z');
    const existingStep = createStepEntity({ updatedAt: recentTimestamp });

    stepRepoMock.findOne.mockResolvedValue(existingStep);

    const staleTimestamp = new Date('2025-09-26T10:59:00.000Z');
    const result = await repository.autoSaveStep({
      anamnesisId,
      tenantId,
      stepNumber: 2,
      key: 'lifestyle',
      payload: { extra: 'stale' },
      autoSavedAt: staleTimestamp,
    });

    expect(result.payload).toEqual(existingStep.payload);
    expect(result.updatedAt.toISOString()).toBe(recentTimestamp.toISOString());
    expect(stepRepoMock.save).not.toHaveBeenCalled();
    expect(anamnesisRepoMock.update).toHaveBeenCalledWith(
      { id: anamnesisId, tenantId },
      { lastAutoSavedAt: recentTimestamp, updatedAt: recentTimestamp },
    );
  });
});

describe('AnamnesisRepository.getHistoryByPatient', () => {
  const tenantId = 'tenant-history';
  const patientId = 'patient-history';

  const createHistoryEntity = (overrides: Partial<AnamnesisEntity> = {}): AnamnesisEntity =>
    ({
      id: overrides.id ?? 'history-1',
      consultationId: overrides.consultationId ?? 'consult-history',
      patientId: overrides.patientId ?? patientId,
      professionalId: overrides.professionalId ?? 'professional-history',
      tenantId: overrides.tenantId ?? tenantId,
      status: overrides.status ?? 'submitted',
      totalSteps: overrides.totalSteps ?? 10,
      currentStep: overrides.currentStep ?? 1,
      completionRate: overrides.completionRate ?? 100,
      isDraft: overrides.isDraft ?? false,
      lastAutoSavedAt: Object.prototype.hasOwnProperty.call(overrides, 'lastAutoSavedAt')
        ? (overrides.lastAutoSavedAt ?? null)
        : null,
      submittedAt: Object.prototype.hasOwnProperty.call(overrides, 'submittedAt')
        ? (overrides.submittedAt ?? null)
        : new Date('2025-09-26T10:00:00.000Z'),
      completedAt: Object.prototype.hasOwnProperty.call(overrides, 'completedAt')
        ? (overrides.completedAt ?? null)
        : null,
      createdAt: overrides.createdAt ?? new Date('2025-09-26T09:00:00.000Z'),
      updatedAt: overrides.updatedAt ?? new Date('2025-09-26T10:05:00.000Z'),
      steps: overrides.steps ?? [
        {
          id: 'step-history-1',
          anamnesisId: overrides.id ?? 'history-1',
          stepNumber: 1,
          key: 'identification',
          payload: { fullName: 'Paciente Historico' },
          completed: true,
          hasErrors: false,
          validationScore: 92,
          createdAt: new Date('2025-09-26T09:10:00.000Z'),
          updatedAt: new Date('2025-09-26T10:00:00.000Z'),
        },
      ],
      attachments: overrides.attachments ?? [
        {
          id: 'attachment-history-1',
          anamnesisId: overrides.id ?? 'history-1',
          stepNumber: 1,
          fileName: 'exame-historico.pdf',
          mimeType: 'application/pdf',
          size: 2048,
          storagePath: 'anamneses/history/exame.pdf',
          uploadedBy: 'user-history',
          uploadedAt: new Date('2025-09-26T10:01:00.000Z'),
        },
      ],
      plans: overrides.plans ?? [
        {
          id: 'plan-history-1',
          anamnesisId: overrides.id ?? 'history-1',
          clinicalReasoning: 'Raciocinio clinico',
          summary: 'Resumo gerado',
          therapeuticPlan: { actions: ['Repouso'] },
          riskFactors: [{ id: 'risk-history-1', description: 'Hipertensao', severity: 'high' }],
          recommendations: [
            { id: 'rec-history-1', description: 'Alongamentos', priority: 'medium' },
          ],
          confidence: 0.85,
          reviewRequired: false,
          approvalStatus: 'pending',
          liked: null,
          feedbackComment: null,
          feedbackGivenBy: null,
          feedbackGivenAt: null,
          generatedAt: new Date('2025-09-26T10:02:00.000Z'),
          createdAt: new Date('2025-09-26T10:02:00.000Z'),
          updatedAt: new Date('2025-09-26T10:03:00.000Z'),
        },
      ],
      aiAnalyses: overrides.aiAnalyses ?? [],
    }) as unknown as AnamnesisEntity;

  const createRepository = (entities: AnamnesisEntity[]) => {
    const queryBuilderMock = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(entities),
    };

    const anamnesisRepoMock = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilderMock),
      update: jest.fn(),
    };

    const dataSource = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === AnamnesisEntity) {
          return anamnesisRepoMock;
        }
        if (entity === AnamnesisStepEntity) {
          return {};
        }
        if (entity === AnamnesisTherapeuticPlanEntity) {
          return {};
        }
        if (entity === AnamnesisAttachmentEntity) {
          return {};
        }
        if (entity === AnamnesisStepTemplateEntity) {
          return {};
        }
        if (entity === AnamnesisAIAnalysisEntity) {
          return {};
        }
        if (entity === AnamnesisAITrainingFeedbackEntity) {
          return {};
        }
        return {};
      }),
    } as unknown as DataSource;

    const repository = new AnamnesisRepository(dataSource);
    return { repository, queryBuilderMock, anamnesisRepoMock };
  };

  it('applies filters, limit and preserves ordering', async () => {
    const submitted = createHistoryEntity({
      id: 'history-submitted',
      status: 'submitted',
      submittedAt: new Date('2025-09-26T12:00:00.000Z'),
      updatedAt: new Date('2025-09-26T12:05:00.000Z'),
    });

    const draft = createHistoryEntity({
      id: 'history-draft',
      status: 'draft',
      submittedAt: null,
      updatedAt: new Date('2025-09-26T11:00:00.000Z'),
      attachments: [],
      plans: [],
    });

    const { repository, queryBuilderMock } = createRepository([draft, submitted]);

    const entries = await repository.getHistoryByPatient(tenantId, patientId, {
      limit: 5,
      statuses: ['draft', 'submitted'],
      includeDrafts: true,
      professionalId: 'professional-history',
    });

    expect(queryBuilderMock.take).toHaveBeenCalledWith(5);
    const statusCall = queryBuilderMock.andWhere.mock.calls.find(([clause]) =>
      clause.includes('status'),
    );
    expect(statusCall?.[1]).toEqual({ statuses: ['draft', 'submitted'] });
    const professionalCall = queryBuilderMock.andWhere.mock.calls.find(([clause]) =>
      clause.includes('professionalId'),
    );
    expect(professionalCall?.[1]).toEqual({ professionalId: 'professional-history' });

    expect(entries).toHaveLength(2);

    const ids = new Set(entries.map((entry) => entry.id));
    expect(ids).toEqual(new Set(['history-draft', 'history-submitted']));

    const submittedEntry = entries.find((entry) => entry.id === 'history-submitted');
    expect(submittedEntry).toBeDefined();
    expect(submittedEntry?.attachments[0]?.uploadedAt).toBeInstanceOf(Date);
    expect(submittedEntry?.latestPlan?.therapeuticPlan).toEqual({ actions: ['Repouso'] });
  });

  it('fallbacks to default statuses when drafts are excluded', async () => {
    const submitted = createHistoryEntity();

    const { repository, queryBuilderMock } = createRepository([submitted]);

    const entries = await repository.getHistoryByPatient(tenantId, patientId, {
      statuses: ['draft'],
      includeDrafts: false,
    });

    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe(submitted.id);

    const statusCall = queryBuilderMock.andWhere.mock.calls.find(([clause]) =>
      clause.includes('status'),
    );
    expect(statusCall?.[1]).toEqual({ statuses: ['submitted', 'completed'] });

    const [limitValue] = queryBuilderMock.take.mock.calls[0];
    expect(limitValue).toBe(10);
  });
});
describe('AnamnesisRepository.getStepTemplates', () => {
  const buildRepository = () => {
    const stepTemplateRepoMock = {
      createQueryBuilder: jest.fn(),
    };

    const dataSource = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === AnamnesisStepTemplateEntity) {
          return stepTemplateRepoMock;
        }
        if (entity === AnamnesisAITrainingFeedbackEntity) {
          return {
            create: jest.fn(),
            save: jest.fn(),
          };
        }
        return {
          createQueryBuilder: jest.fn(),
          findOne: jest.fn(),
          save: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        };
      }),
    } as unknown as DataSource;

    const repository = new AnamnesisRepository(dataSource);

    return { repository, stepTemplateRepoMock };
  };

  const buildQueryBuilder = (templates: AnamnesisStepTemplateEntity[]) => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(templates),
  });

  it('prioriza template da especialidade quando disponivel', async () => {
    const { repository, stepTemplateRepoMock } = buildRepository();
    const defaultTemplate = createTemplateEntity({ id: 'tpl-default', specialty: 'default' });
    const nutritionTemplate = createTemplateEntity({
      id: 'tpl-nutrition',
      specialty: 'nutrition',
    });

    const listQueryBuilder = buildQueryBuilder([defaultTemplate, nutritionTemplate]);
    stepTemplateRepoMock.createQueryBuilder.mockReturnValueOnce(listQueryBuilder);

    const result = await repository.getStepTemplates({
      tenantId: 'tenant-templates',
      specialty: 'nutrition',
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('tpl-nutrition');
  });

  it('mantem template default quando especialidade nao informada', async () => {
    const { repository, stepTemplateRepoMock } = buildRepository();
    const defaultTemplate = createTemplateEntity({ id: 'tpl-default', specialty: 'default' });
    const nutritionTemplate = createTemplateEntity({
      id: 'tpl-nutrition',
      specialty: 'nutrition',
    });

    const listQueryBuilder = buildQueryBuilder([defaultTemplate, nutritionTemplate]);
    stepTemplateRepoMock.createQueryBuilder.mockReturnValueOnce(listQueryBuilder);

    const result = await repository.getStepTemplates({
      tenantId: 'tenant-templates',
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('tpl-default');
  });

  it('getStepTemplateByKey retorna variante da especialidade quando disponivel', async () => {
    const { repository, stepTemplateRepoMock } = buildRepository();
    const defaultTemplate = createTemplateEntity({ id: 'tpl-default', specialty: 'default' });
    const physioTemplate = createTemplateEntity({
      id: 'tpl-physio',
      specialty: 'physiotherapy',
    });

    const keyQueryBuilder = buildQueryBuilder([defaultTemplate, physioTemplate]);
    stepTemplateRepoMock.createQueryBuilder.mockReturnValueOnce(keyQueryBuilder);

    const result = await repository.getStepTemplateByKey('physicalExam', {
      tenantId: 'tenant-templates',
      specialty: 'physiotherapy',
    });

    expect(result?.id).toBe('tpl-physio');
  });
});
