import { ConfigService } from '@nestjs/config';
import { DomainEvent } from '@shared/events/domain-event.interface';
import { AnamnesisMetricsService } from '@modules/anamnesis/services/anamnesis-metrics.service';

const buildEvent = (overrides: Partial<DomainEvent> = {}): DomainEvent => ({
  eventId: overrides.eventId ?? 'event-1',
  eventName: overrides.eventName ?? 'test.event',
  aggregateId: overrides.aggregateId ?? 'aggregate-1',
  occurredOn: overrides.occurredOn ?? new Date('2025-09-26T00:00:00Z'),
  payload: overrides.payload ?? {},
  metadata: overrides.metadata,
});

describe('AnamnesisMetricsService', () => {
  let service: AnamnesisMetricsService;
  let configService: ConfigService;

  beforeEach(() => {
    const configMap: Record<string, string | number | undefined> = {
      ANAMNESIS_AI_COST_TOKEN_INPUT: 0.0005,
      ANAMNESIS_AI_COST_TOKEN_OUTPUT: 0.001,
      ANAMNESIS_AI_LATENCY_ALERT_MS: 1000,
    };

    configService = {
      get: jest.fn((key: string) => configMap[key]),
    } as unknown as ConfigService;

    service = new AnamnesisMetricsService(configService);
    service.reset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('records step saves and computes averages', () => {
    service.recordStepSaved(
      buildEvent({
        eventName: 'anamnesis.step_saved',
        payload: { completionRate: 50, completed: true },
        metadata: { tenantId: 'tenant-1' },
      }),
    );

    service.recordStepSaved(
      buildEvent({
        eventName: 'anamnesis.step_saved',
        payload: { completionRate: 75, autoSave: true },
        metadata: { tenantId: 'tenant-1' },
      }),
    );

    const snapshot = service.getSnapshot('tenant-1');
    expect(snapshot.stepsSaved).toBe(2);
    expect(snapshot.autoSaves).toBe(1);
    expect(snapshot.completedSteps).toBe(1);
    expect(snapshot.averageStepCompletionRate).toBe(62.5);
  });

  it('records submissions and averages completion rate', () => {
    service.recordSubmission(
      buildEvent({
        eventName: 'anamnesis.submitted',
        payload: { completionRate: 80 },
      }),
    );

    service.recordSubmission(
      buildEvent({
        eventName: 'anamnesis.submitted',
        payload: { completionRate: 100 },
      }),
    );

    const snapshot = service.getSnapshot();
    expect(snapshot.submissions).toBe(2);
    expect(snapshot.averageSubmissionCompletionRate).toBe(90);
  });

  it('records AI completion outcomes, latency and cost', () => {
    const warnSpy = jest
      .spyOn(
        (service as unknown as { logger: { warn: (...args: unknown[]) => void } }).logger,
        'warn',
      )
      .mockImplementation();

    service.recordAICompleted(
      buildEvent({
        eventName: 'anamnesis.ai.completed',
        payload: {
          status: 'completed',
          confidence: 0.8,
          tokensInput: 120,
          tokensOutput: 80,
          latencyMs: 1500,
        },
        metadata: { tenantId: 'tenant-1' },
      }),
    );

    service.recordAICompleted(
      buildEvent({
        eventName: 'anamnesis.ai.completed',
        payload: {
          status: 'failed',
          confidence: 0.4,
          tokensInput: 60,
          tokensOutput: 40,
          latencyMs: 900,
        },
        metadata: { tenantId: 'tenant-1' },
      }),
    );

    const snapshot = service.getSnapshot('tenant-1');
    expect(snapshot.aiCompleted).toBe(1);
    expect(snapshot.aiFailed).toBe(1);
    expect(snapshot.averageAIConfidence).toBe(0.6);
    expect(snapshot.tokensInputTotal).toBe(180);
    expect(snapshot.tokensOutputTotal).toBe(120);
    expect(snapshot.averageAILatencyMs).toBe(1200);
    expect(snapshot.maxAILatencyMs).toBe(1500);
    expect(snapshot.totalAICost).toBeCloseTo(0.21, 5);
    expect(warnSpy).toHaveBeenCalledWith(
      'AI latency threshold exceeded',
      expect.objectContaining({ tenantId: 'tenant-1', latencyMs: 1500, thresholdMs: 1000 }),
    );
  });

  it('records plan feedback likes and approvals', () => {
    service.recordPlanFeedback(
      buildEvent({
        eventName: 'anamnesis.plan.feedback_saved',
        payload: { approvalStatus: 'approved', liked: true },
        metadata: { tenantId: 'tenant-2' },
      }),
    );

    service.recordPlanFeedback(
      buildEvent({
        eventName: 'anamnesis.plan.feedback_saved',
        payload: { approvalStatus: 'rejected', liked: false },
        metadata: { tenantId: 'tenant-2' },
      }),
    );

    const snapshot = service.getSnapshot('tenant-2');
    expect(snapshot.feedback.total).toBe(2);
    expect(snapshot.feedback.approvals).toBe(1);
    expect(snapshot.feedback.rejections).toBe(1);
    expect(snapshot.feedback.likes).toBe(1);
    expect(snapshot.feedback.dislikes).toBe(1);
  });
});
