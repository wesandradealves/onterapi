import { ConfigService } from '@nestjs/config';
import { DomainEvent } from '@shared/events/domain-event.interface';
import {
  IAnamnesisMetricsRepository,
  MetricsAggregate,
} from '@domain/anamnesis/interfaces/repositories/anamnesis-metrics.repository.interface';
import { AnamnesisMetricsService } from '@modules/anamnesis/services/anamnesis-metrics.service';

const buildEvent = (overrides: Partial<DomainEvent> = {}): DomainEvent => ({
  eventId: overrides.eventId ?? 'event-1',
  eventName: overrides.eventName ?? 'test.event',
  aggregateId: overrides.aggregateId ?? 'aggregate-1',
  occurredOn: overrides.occurredOn ?? new Date('2025-09-26T00:00:00Z'),
  payload: overrides.payload ?? {},
  metadata: overrides.metadata,
});

const buildAggregate = (overrides: Partial<MetricsAggregate> = {}): MetricsAggregate => ({
  stepsSaved: 0,
  autoSaves: 0,
  completedSteps: 0,
  stepCompletionRateSum: 0,
  stepCompletionRateCount: 0,
  submissions: 0,
  submissionCompletionRateSum: 0,
  aiCompleted: 0,
  aiFailed: 0,
  aiConfidenceSum: 0,
  aiConfidenceCount: 0,
  tokensInputSum: 0,
  tokensOutputSum: 0,
  aiLatencySum: 0,
  aiLatencyCount: 0,
  aiLatencyMax: 0,
  aiCostSum: 0,
  feedbackTotal: 0,
  feedbackApprovals: 0,
  feedbackModifications: 0,
  feedbackRejections: 0,
  feedbackLikes: 0,
  feedbackDislikes: 0,
  lastUpdatedAt: null,
  ...overrides,
});

describe('AnamnesisMetricsService', () => {
  let service: AnamnesisMetricsService;
  let configService: ConfigService;
  let repository: jest.Mocked<IAnamnesisMetricsRepository>;

  beforeEach(() => {
    const configMap: Record<string, string | number | undefined> = {
      ANAMNESIS_AI_COST_TOKEN_INPUT: 0.0005,
      ANAMNESIS_AI_COST_TOKEN_OUTPUT: 0.001,
      ANAMNESIS_AI_LATENCY_ALERT_MS: 1000,
    };

    configService = {
      get: jest.fn((key: string) => configMap[key]),
    } as unknown as ConfigService;

    repository = {
      incrementMetrics: jest.fn().mockResolvedValue(undefined),
      getAggregate: jest.fn().mockResolvedValue(null),
      getAggregateForRange: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<IAnamnesisMetricsRepository>;

    service = new AnamnesisMetricsService(configService, repository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('records step saves and forwards increments to repository', async () => {
    const event = buildEvent({
      eventName: 'anamnesis.step_saved',
      payload: { completionRate: 50, completed: true, autoSave: true },
      metadata: { tenantId: 'tenant-1' },
    });

    await service.recordStepSaved(event);

    expect(repository.incrementMetrics).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      occurredOn: event.occurredOn,
      increments: {
        stepsSaved: 1,
        autoSaves: 1,
        completedSteps: 1,
        stepCompletionRateSum: 50,
        stepCompletionRateCount: 1,
      },
    });
  });

  it('records submissions and latched completion rate', async () => {
    const event = buildEvent({
      eventName: 'anamnesis.submitted',
      payload: { completionRate: 80 },
      metadata: { tenantId: 'tenant-2' },
    });

    await service.recordSubmission(event);

    expect(repository.incrementMetrics).toHaveBeenCalledWith({
      tenantId: 'tenant-2',
      occurredOn: event.occurredOn,
      increments: {
        submissions: 1,
        submissionCompletionRateSum: 80,
      },
    });
  });

  it('records AI completion outcomes, latency and cost', async () => {
    const warnSpy = jest
      .spyOn(
        (service as unknown as { logger: { warn: (...args: unknown[]) => void } }).logger,
        'warn',
      )
      .mockImplementation();

    const event = buildEvent({
      eventName: 'anamnesis.ai.completed',
      payload: {
        status: 'completed',
        confidence: 0.8,
        tokensInput: 120,
        tokensOutput: 80,
        latencyMs: 1500,
      },
      metadata: { tenantId: 'tenant-3' },
    });

    await service.recordAICompleted(event);

    expect(repository.incrementMetrics).toHaveBeenCalledWith({
      tenantId: 'tenant-3',
      occurredOn: event.occurredOn,
      increments: {
        aiCompleted: 1,
        aiFailed: 0,
        aiConfidenceSum: 0.8,
        aiConfidenceCount: 1,
        tokensInputSum: 120,
        tokensOutputSum: 80,
        aiLatencySum: 1500,
        aiLatencyCount: 1,
        aiLatencyMax: 1500,
        aiCostSum: 120 * 0.0005 + 80 * 0.001,
      },
    });
    expect(warnSpy).toHaveBeenCalledWith(
      'AI latency threshold exceeded',
      expect.objectContaining({ tenantId: 'tenant-3', latencyMs: 1500, thresholdMs: 1000 }),
    );
  });

  it('records plan feedback likes and approvals', async () => {
    const event = buildEvent({
      eventName: 'anamnesis.plan.feedback_saved',
      payload: { approvalStatus: 'approved', liked: true },
      metadata: { tenantId: 'tenant-4' },
    });

    await service.recordPlanFeedback(event);

    expect(repository.incrementMetrics).toHaveBeenCalledWith({
      tenantId: 'tenant-4',
      occurredOn: event.occurredOn,
      increments: {
        feedbackTotal: 1,
        feedbackApprovals: 1,
        feedbackModifications: 0,
        feedbackRejections: 0,
        feedbackLikes: 1,
        feedbackDislikes: 0,
      },
    });
  });

  it('returns snapshot from repository aggregate', async () => {
    const aggregate = buildAggregate({
      stepsSaved: 3,
      autoSaves: 1,
      completedSteps: 2,
      stepCompletionRateSum: 150,
      stepCompletionRateCount: 3,
      submissions: 2,
      submissionCompletionRateSum: 180,
      aiCompleted: 1,
      aiFailed: 1,
      aiConfidenceSum: 1.2,
      aiConfidenceCount: 2,
      tokensInputSum: 300,
      tokensOutputSum: 200,
      aiLatencySum: 2300,
      aiLatencyCount: 2,
      aiLatencyMax: 1500,
      aiCostSum: 0.24,
      feedbackTotal: 2,
      feedbackApprovals: 1,
      feedbackRejections: 1,
      feedbackLikes: 1,
      feedbackDislikes: 1,
      lastUpdatedAt: new Date('2025-10-01T12:00:00Z'),
    });

    repository.getAggregate.mockResolvedValueOnce(aggregate);

    const snapshot = await service.getSnapshot('tenant-5');

    expect(snapshot).toEqual({
      stepsSaved: 3,
      autoSaves: 1,
      completedSteps: 2,
      averageStepCompletionRate: 50,
      submissions: 2,
      averageSubmissionCompletionRate: 90,
      aiCompleted: 1,
      aiFailed: 1,
      averageAIConfidence: 0.6,
      tokensInputTotal: 300,
      tokensOutputTotal: 200,
      averageAILatencyMs: 1150,
      maxAILatencyMs: 1500,
      totalAICost: 0.24,
      feedback: {
        total: 2,
        approvals: 1,
        modifications: 0,
        rejections: 1,
        likes: 1,
        dislikes: 1,
      },
      lastUpdatedAt: aggregate.lastUpdatedAt,
    });
  });

  it('returns empty snapshot when repository has no data', async () => {
    repository.getAggregate.mockResolvedValueOnce(null);
    const snapshot = await service.getSnapshot();
    expect(snapshot.stepsSaved).toBe(0);
    expect(snapshot.feedback.total).toBe(0);
  });
});
