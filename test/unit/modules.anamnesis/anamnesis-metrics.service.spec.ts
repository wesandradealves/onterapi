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

  beforeEach(() => {
    service = new AnamnesisMetricsService();
    service.reset();
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

  it('records AI completion outcomes and confidence', () => {
    service.recordAICompleted(
      buildEvent({
        eventName: 'anamnesis.ai.completed',
        payload: { status: 'completed', confidence: 0.8 },
        metadata: { tenantId: 'tenant-1' },
      }),
    );

    service.recordAICompleted(
      buildEvent({
        eventName: 'anamnesis.ai.completed',
        payload: { status: 'failed', confidence: 0.4 },
        metadata: { tenantId: 'tenant-1' },
      }),
    );

    const snapshot = service.getSnapshot('tenant-1');
    expect(snapshot.aiCompleted).toBe(1);
    expect(snapshot.aiFailed).toBe(1);
    expect(snapshot.averageAIConfidence).toBe(0.6);
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
