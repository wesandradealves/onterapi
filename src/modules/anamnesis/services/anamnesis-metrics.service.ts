import { Injectable, Logger } from '@nestjs/common';

import { DomainEvent } from '../../../shared/events/domain-event.interface';

interface InternalStats {
  stepsSaved: number;
  autoSaves: number;
  completedSteps: number;
  stepCompletionRateSum: number;
  stepCompletionRateCount: number;
  submissions: number;
  submissionCompletionRateSum: number;
  aiCompleted: number;
  aiFailed: number;
  aiConfidenceSum: number;
  aiConfidenceCount: number;
  feedbackTotal: number;
  feedbackApprovals: number;
  feedbackModifications: number;
  feedbackRejections: number;
  feedbackLikes: number;
  feedbackDislikes: number;
  lastUpdatedAt?: Date;
}

export interface AnamnesisMetricsSnapshot {
  stepsSaved: number;
  autoSaves: number;
  completedSteps: number;
  averageStepCompletionRate: number;
  submissions: number;
  averageSubmissionCompletionRate: number;
  aiCompleted: number;
  aiFailed: number;
  averageAIConfidence: number;
  feedback: {
    total: number;
    approvals: number;
    modifications: number;
    rejections: number;
    likes: number;
    dislikes: number;
  };
  lastUpdatedAt?: Date;
}

const createEmptyStats = (): InternalStats => ({
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
  feedbackTotal: 0,
  feedbackApprovals: 0,
  feedbackModifications: 0,
  feedbackRejections: 0,
  feedbackLikes: 0,
  feedbackDislikes: 0,
  lastUpdatedAt: undefined,
});

@Injectable()
export class AnamnesisMetricsService {
  private readonly logger = new Logger(AnamnesisMetricsService.name);
  private readonly globalStats: InternalStats = createEmptyStats();
  private readonly tenantStats = new Map<string, InternalStats>();

  recordStepSaved(event: DomainEvent): void {
    const payload = event.payload as Record<string, unknown>;
    const tenantId = this.resolveTenantId(event);
    const completed = Boolean(payload['completed']);
    const completionRate = this.extractNumber(payload['completionRate']);
    const autoSave = Boolean(payload['autoSave']);

    this.applyToStats(tenantId, (stats) => {
      stats.stepsSaved += 1;
      if (autoSave) {
        stats.autoSaves += 1;
      }
      if (completed) {
        stats.completedSteps += 1;
      }
      if (typeof completionRate === 'number') {
        stats.stepCompletionRateSum += completionRate;
        stats.stepCompletionRateCount += 1;
      }
      stats.lastUpdatedAt = new Date();
    });

    this.logger.debug('Metrics updated: step saved', {
      tenantId,
      completionRate,
      autoSave,
      completed,
    });
  }

  recordSubmission(event: DomainEvent): void {
    const payload = event.payload as Record<string, unknown>;
    const tenantId = this.resolveTenantId(event);
    const completionRate = this.extractNumber(payload['completionRate']);

    this.applyToStats(tenantId, (stats) => {
      stats.submissions += 1;
      if (typeof completionRate === 'number') {
        stats.submissionCompletionRateSum += completionRate;
      }
      stats.lastUpdatedAt = new Date();
    });

    this.logger.debug('Metrics updated: anamnesis submitted', {
      tenantId,
      completionRate,
    });
  }

  recordAICompleted(event: DomainEvent): void {
    const payload = event.payload as Record<string, unknown>;
    const tenantId = this.resolveTenantId(event);
    const status = String(payload['status'] ?? '');
    const confidence = this.extractNumber(payload['confidence']);

    this.applyToStats(tenantId, (stats) => {
      if (status === 'completed') {
        stats.aiCompleted += 1;
      } else {
        stats.aiFailed += 1;
      }
      if (typeof confidence === 'number') {
        stats.aiConfidenceSum += confidence;
        stats.aiConfidenceCount += 1;
      }
      stats.lastUpdatedAt = new Date();
    });

    this.logger.debug('Metrics updated: AI analysis completed', {
      tenantId,
      status,
      confidence,
    });
  }

  recordPlanFeedback(event: DomainEvent): void {
    const payload = event.payload as Record<string, unknown>;
    const tenantId = this.resolveTenantId(event);
    const approvalStatus = String(payload['approvalStatus'] ?? '');
    const likedValue = payload['liked'];
    const liked = typeof likedValue === 'boolean' ? likedValue : undefined;

    this.applyToStats(tenantId, (stats) => {
      stats.feedbackTotal += 1;
      if (approvalStatus === 'approved') {
        stats.feedbackApprovals += 1;
      } else if (approvalStatus === 'modified') {
        stats.feedbackModifications += 1;
      } else if (approvalStatus === 'rejected') {
        stats.feedbackRejections += 1;
      }

      if (liked === true) {
        stats.feedbackLikes += 1;
      } else if (liked === false) {
        stats.feedbackDislikes += 1;
      }

      stats.lastUpdatedAt = new Date();
    });

    this.logger.debug('Metrics updated: plan feedback', {
      tenantId,
      approvalStatus,
      liked,
    });
  }

  getSnapshot(tenantId?: string): AnamnesisMetricsSnapshot {
    const stats = tenantId ? this.getOrCreateTenantStats(tenantId) : this.globalStats;

    return {
      stepsSaved: stats.stepsSaved,
      autoSaves: stats.autoSaves,
      completedSteps: stats.completedSteps,
      averageStepCompletionRate: this.calculateAverage(
        stats.stepCompletionRateSum,
        stats.stepCompletionRateCount,
      ),
      submissions: stats.submissions,
      averageSubmissionCompletionRate: this.calculateAverage(
        stats.submissionCompletionRateSum,
        stats.submissions,
      ),
      aiCompleted: stats.aiCompleted,
      aiFailed: stats.aiFailed,
      averageAIConfidence: this.calculateAverage(stats.aiConfidenceSum, stats.aiConfidenceCount),
      feedback: {
        total: stats.feedbackTotal,
        approvals: stats.feedbackApprovals,
        modifications: stats.feedbackModifications,
        rejections: stats.feedbackRejections,
        likes: stats.feedbackLikes,
        dislikes: stats.feedbackDislikes,
      },
      lastUpdatedAt: stats.lastUpdatedAt,
    };
  }

  reset(): void {
    this.resetStats(this.globalStats);
    this.tenantStats.forEach((stats) => this.resetStats(stats));
  }

  private applyToStats(tenantId: string | undefined, mutate: (stats: InternalStats) => void): void {
    mutate(this.globalStats);
    if (tenantId) {
      mutate(this.getOrCreateTenantStats(tenantId));
    }
  }

  private getOrCreateTenantStats(tenantId: string): InternalStats {
    let stats = this.tenantStats.get(tenantId);
    if (!stats) {
      stats = createEmptyStats();
      this.tenantStats.set(tenantId, stats);
    }
    return stats;
  }

  private calculateAverage(sum: number, count: number): number {
    return count > 0 ? Number((sum / count).toFixed(2)) : 0;
  }

  private resetStats(stats: InternalStats): void {
    const fresh = createEmptyStats();
    Object.assign(stats, fresh);
  }

  private resolveTenantId(event: DomainEvent): string | undefined {
    const fromMetadata = event.metadata?.tenantId;
    const fromPayload =
      event.payload && typeof event.payload === 'object'
        ? (event.payload as Record<string, unknown>)['tenantId']
        : undefined;

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
}
