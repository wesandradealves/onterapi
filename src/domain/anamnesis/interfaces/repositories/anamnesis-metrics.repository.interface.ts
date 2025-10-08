export const IAnamnesisMetricsRepositoryToken = Symbol('IAnamnesisMetricsRepository');

export interface MetricsIncrement {
  stepsSaved?: number;
  autoSaves?: number;
  completedSteps?: number;
  stepCompletionRateSum?: number;
  stepCompletionRateCount?: number;
  submissions?: number;
  submissionCompletionRateSum?: number;
  aiCompleted?: number;
  aiFailed?: number;
  aiConfidenceSum?: number;
  aiConfidenceCount?: number;
  tokensInputSum?: number;
  tokensOutputSum?: number;
  aiLatencySum?: number;
  aiLatencyCount?: number;
  aiLatencyMax?: number;
  aiCostSum?: number;
  feedbackTotal?: number;
  feedbackApprovals?: number;
  feedbackModifications?: number;
  feedbackRejections?: number;
  feedbackLikes?: number;
  feedbackDislikes?: number;
}

export interface IncrementMetricsInput {
  tenantId?: string | null;
  occurredOn: Date;
  increments: MetricsIncrement;
}

export interface MetricsAggregate {
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
  tokensInputSum: number;
  tokensOutputSum: number;
  aiLatencySum: number;
  aiLatencyCount: number;
  aiLatencyMax: number;
  aiCostSum: number;
  feedbackTotal: number;
  feedbackApprovals: number;
  feedbackModifications: number;
  feedbackRejections: number;
  feedbackLikes: number;
  feedbackDislikes: number;
  lastUpdatedAt?: Date | null;
}

export interface IAnamnesisMetricsRepository {
  incrementMetrics(input: IncrementMetricsInput): Promise<void>;
  getAggregate(tenantId?: string | null): Promise<MetricsAggregate | null>;
  getAggregateForRange(
    tenantId: string | null | undefined,
    from: Date,
    to: Date,
  ): Promise<MetricsAggregate | null>;
}
