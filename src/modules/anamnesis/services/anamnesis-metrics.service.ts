import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  IAnamnesisMetricsRepository,
  IAnamnesisMetricsRepositoryToken,
  MetricsAggregate,
  MetricsIncrement,
} from '../../../domain/anamnesis/interfaces/repositories/anamnesis-metrics.repository.interface';
import { AnamnesisMetricsSnapshot } from '../../../domain/anamnesis/types/anamnesis.types';
import { DomainEvent } from '../../../shared/events/domain-event.interface';

const EMPTY_SNAPSHOT: AnamnesisMetricsSnapshot = {
  stepsSaved: 0,
  autoSaves: 0,
  completedSteps: 0,
  averageStepCompletionRate: 0,
  submissions: 0,
  averageSubmissionCompletionRate: 0,
  aiCompleted: 0,
  aiFailed: 0,
  averageAIConfidence: 0,
  tokensInputTotal: 0,
  tokensOutputTotal: 0,
  averageAILatencyMs: 0,
  maxAILatencyMs: 0,
  totalAICost: 0,
  feedback: {
    total: 0,
    approvals: 0,
    modifications: 0,
    rejections: 0,
    likes: 0,
    dislikes: 0,
  },
  lastUpdatedAt: null,
};

@Injectable()
export class AnamnesisMetricsService {
  private readonly logger = new Logger(AnamnesisMetricsService.name);
  private readonly costInputPerToken: number;
  private readonly costOutputPerToken: number;
  private readonly latencyAlertThresholdMs: number;

  constructor(
    private readonly configService: ConfigService,
    @Inject(IAnamnesisMetricsRepositoryToken)
    private readonly metricsRepository: IAnamnesisMetricsRepository,
  ) {
    this.costInputPerToken = this.parsePositiveNumber('ANAMNESIS_AI_COST_TOKEN_INPUT');
    this.costOutputPerToken = this.parsePositiveNumber('ANAMNESIS_AI_COST_TOKEN_OUTPUT');
    this.latencyAlertThresholdMs = this.parsePositiveNumber('ANAMNESIS_AI_LATENCY_ALERT_MS');
  }

  async recordStepSaved(event: DomainEvent): Promise<void> {
    const payload = event.payload as Record<string, unknown>;
    const tenantId = this.resolveTenantId(event);
    const completed = Boolean(payload['completed']);
    const completionRate = this.extractNumber(payload['completionRate']);
    const autoSave = Boolean(payload['autoSave']);

    const increments: MetricsIncrement = {
      stepsSaved: 1,
      autoSaves: autoSave ? 1 : 0,
      completedSteps: completed ? 1 : 0,
      stepCompletionRateSum: completionRate ?? 0,
      stepCompletionRateCount: completionRate !== undefined ? 1 : 0,
    };

    await this.persistMetrics(event.occurredOn, tenantId, increments);

    this.logger.debug('Metrics updated: step saved', {
      tenantId,
      completionRate,
      autoSave,
      completed,
    });
  }

  async recordSubmission(event: DomainEvent): Promise<void> {
    const payload = event.payload as Record<string, unknown>;
    const tenantId = this.resolveTenantId(event);
    const completionRate = this.extractNumber(payload['completionRate']);

    const increments: MetricsIncrement = {
      submissions: 1,
      submissionCompletionRateSum: completionRate ?? 0,
    };

    await this.persistMetrics(event.occurredOn, tenantId, increments);

    this.logger.debug('Metrics updated: anamnesis submitted', { tenantId, completionRate });
  }

  async recordAICompleted(event: DomainEvent): Promise<void> {
    const payload = event.payload as Record<string, unknown>;
    const tenantId = this.resolveTenantId(event);
    const status = String(payload['status'] ?? 'completed');
    const confidence = this.extractNumber(payload['confidence']);
    const tokensInput = this.extractNumber(payload['tokensInput']);
    const tokensOutput = this.extractNumber(payload['tokensOutput']);
    const latencyMs = this.extractNumber(payload['latencyMs']);
    const cost = this.calculateCost(tokensInput, tokensOutput);

    const success = status === 'completed';

    const increments: MetricsIncrement = {
      aiCompleted: success ? 1 : 0,
      aiFailed: success ? 0 : 1,
      aiConfidenceSum: confidence ?? 0,
      aiConfidenceCount: confidence !== undefined ? 1 : 0,
      tokensInputSum: tokensInput ?? 0,
      tokensOutputSum: tokensOutput ?? 0,
      aiLatencySum: latencyMs ?? 0,
      aiLatencyCount: latencyMs !== undefined ? 1 : 0,
      aiLatencyMax: latencyMs ?? 0,
      aiCostSum: cost ?? 0,
    };

    await this.persistMetrics(event.occurredOn, tenantId, increments);

    if (
      typeof latencyMs === 'number' &&
      this.latencyAlertThresholdMs > 0 &&
      latencyMs > this.latencyAlertThresholdMs
    ) {
      this.logger.warn('AI latency threshold exceeded', {
        tenantId,
        latencyMs,
        thresholdMs: this.latencyAlertThresholdMs,
        analysisId: payload['analysisId'],
      });
    } else {
      this.logger.debug('Metrics updated: AI result', {
        tenantId,
        status,
        confidence,
        tokensInput,
        tokensOutput,
        latencyMs,
        cost,
      });
    }
  }

  async recordPlanFeedback(event: DomainEvent): Promise<void> {
    const payload = event.payload as Record<string, unknown>;
    const tenantId = this.resolveTenantId(event);
    const approvalStatus = String(payload['approvalStatus'] ?? '').toLowerCase();
    const liked = payload['liked'];

    const increments: MetricsIncrement = {
      feedbackTotal: 1,
      feedbackApprovals: approvalStatus === 'approved' ? 1 : 0,
      feedbackModifications: approvalStatus === 'modified' ? 1 : 0,
      feedbackRejections: approvalStatus === 'rejected' ? 1 : 0,
      feedbackLikes: liked === true ? 1 : 0,
      feedbackDislikes: liked === false ? 1 : 0,
    };

    await this.persistMetrics(event.occurredOn, tenantId, increments);

    this.logger.debug('Metrics updated: plan feedback', {
      tenantId,
      approvalStatus,
      liked,
    });
  }

  async getSnapshot(tenantId?: string | null): Promise<AnamnesisMetricsSnapshot> {
    const aggregate = await this.metricsRepository.getAggregate(tenantId);
    if (!aggregate) {
      return { ...EMPTY_SNAPSHOT };
    }

    return this.transformAggregateToSnapshot(aggregate);
  }

  async getSnapshotForRange(
    tenantId: string | null | undefined,
    from: Date,
    to: Date,
  ): Promise<AnamnesisMetricsSnapshot> {
    const aggregate = await this.metricsRepository.getAggregateForRange(tenantId, from, to);
    if (!aggregate) {
      return { ...EMPTY_SNAPSHOT };
    }

    return this.transformAggregateToSnapshot(aggregate);
  }

  async reset(): Promise<void> {
    this.logger.warn(
      'AnamnesisMetricsService.reset() foi invocado; nenhuma a  o executada porque os dados agora s o persistentes.',
    );
  }

  private async persistMetrics(
    occurredOn: Date,
    tenantId: string | undefined,
    increments: MetricsIncrement,
  ): Promise<void> {
    await this.metricsRepository.incrementMetrics({
      tenantId: tenantId ?? null,
      occurredOn,
      increments,
    });
  }

  private transformAggregateToSnapshot(aggregate: MetricsAggregate): AnamnesisMetricsSnapshot {
    return {
      stepsSaved: aggregate.stepsSaved,
      autoSaves: aggregate.autoSaves,
      completedSteps: aggregate.completedSteps,
      averageStepCompletionRate: this.calculateAverage(
        aggregate.stepCompletionRateSum,
        aggregate.stepCompletionRateCount,
      ),
      submissions: aggregate.submissions,
      averageSubmissionCompletionRate: this.calculateAverage(
        aggregate.submissionCompletionRateSum,
        aggregate.submissions,
      ),
      aiCompleted: aggregate.aiCompleted,
      aiFailed: aggregate.aiFailed,
      averageAIConfidence: this.calculateAverage(
        aggregate.aiConfidenceSum,
        aggregate.aiConfidenceCount,
      ),
      tokensInputTotal: aggregate.tokensInputSum,
      tokensOutputTotal: aggregate.tokensOutputSum,
      averageAILatencyMs: this.calculateAverage(aggregate.aiLatencySum, aggregate.aiLatencyCount),
      maxAILatencyMs: aggregate.aiLatencyMax,
      totalAICost: this.roundCost(aggregate.aiCostSum),
      feedback: {
        total: aggregate.feedbackTotal,
        approvals: aggregate.feedbackApprovals,
        modifications: aggregate.feedbackModifications,
        rejections: aggregate.feedbackRejections,
        likes: aggregate.feedbackLikes,
        dislikes: aggregate.feedbackDislikes,
      },
      lastUpdatedAt: aggregate.lastUpdatedAt ?? null,
    };
  }

  private calculateAverage(sum: number, count: number): number {
    if (!count || count <= 0) {
      return 0;
    }
    return Number((sum / count).toFixed(2));
  }

  private roundCost(value: number): number {
    if (!value || Number.isNaN(value)) {
      return 0;
    }
    return Math.round(value * 1_000_000) / 1_000_000;
  }

  private calculateCost(tokensInput?: number, tokensOutput?: number): number | undefined {
    if (tokensInput === undefined && tokensOutput === undefined) {
      return undefined;
    }

    const inputCost = tokensInput ? tokensInput * this.costInputPerToken : 0;
    const outputCost = tokensOutput ? tokensOutput * this.costOutputPerToken : 0;
    const total = inputCost + outputCost;
    if (total <= 0) {
      return undefined;
    }
    return total;
  }

  private resolveTenantId(event: DomainEvent): string | undefined {
    const fromMetadata = event.metadata?.tenantId;
    const payload = event.payload as Record<string, unknown>;
    const fromPayload = payload ? (payload['tenantId'] as string | undefined) : undefined;

    if (typeof fromMetadata === 'string' && fromMetadata.length > 0) {
      return fromMetadata;
    }
    if (typeof fromPayload === 'string' && fromPayload.length > 0) {
      return fromPayload;
    }
    return undefined;
  }

  private extractNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    return undefined;
  }

  private parsePositiveNumber(envKey: string): number {
    const raw = this.configService.get<string | number | undefined>(envKey);
    if (raw === undefined || raw === null || raw === '') {
      return 0;
    }
    const value = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(value) || value <= 0) {
      return 0;
    }
    return value;
  }
}
