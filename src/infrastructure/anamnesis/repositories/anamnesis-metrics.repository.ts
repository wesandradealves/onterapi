import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import {
  IAnamnesisMetricsRepository,
  IncrementMetricsInput,
  MetricsAggregate,
} from '../../../domain/anamnesis/interfaces/repositories/anamnesis-metrics.repository.interface';
import { AnamnesisMetricEntity } from '../entities/anamnesis-metric.entity';

type ColumnKey = keyof Omit<MetricsAggregate, 'lastUpdatedAt'>;

const NUMERIC_COLUMNS: ColumnKey[] = [
  'stepCompletionRateSum',
  'submissionCompletionRateSum',
  'aiConfidenceSum',
  'aiCostSum',
];

const BIGINT_COLUMNS: ColumnKey[] = ['tokensInputSum', 'tokensOutputSum', 'aiLatencySum'];

const INTEGER_COLUMNS: ColumnKey[] = [
  'stepsSaved',
  'autoSaves',
  'completedSteps',
  'stepCompletionRateCount',
  'submissions',
  'aiCompleted',
  'aiFailed',
  'aiConfidenceCount',
  'aiLatencyCount',
  'aiLatencyMax',
  'feedbackTotal',
  'feedbackApprovals',
  'feedbackModifications',
  'feedbackRejections',
  'feedbackLikes',
  'feedbackDislikes',
];

const ALL_COLUMNS: ColumnKey[] = [
  'stepsSaved',
  'autoSaves',
  'completedSteps',
  'stepCompletionRateSum',
  'stepCompletionRateCount',
  'submissions',
  'submissionCompletionRateSum',
  'aiCompleted',
  'aiFailed',
  'aiConfidenceSum',
  'aiConfidenceCount',
  'tokensInputSum',
  'tokensOutputSum',
  'aiLatencySum',
  'aiLatencyCount',
  'aiLatencyMax',
  'aiCostSum',
  'feedbackTotal',
  'feedbackApprovals',
  'feedbackModifications',
  'feedbackRejections',
  'feedbackLikes',
  'feedbackDislikes',
];

@Injectable()
export class AnamnesisMetricsRepository implements IAnamnesisMetricsRepository {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async incrementMetrics({
    tenantId,
    occurredOn,
    increments,
  }: IncrementMetricsInput): Promise<void> {
    const metricDate = this.toDateOnly(occurredOn);
    const payload = this.buildPayload(increments);

    const baseColumns = ['tenant_id', 'metric_date', 'last_updated_at'];
    const insertColumns = [
      ...baseColumns,
      ...ALL_COLUMNS.map((column) => this.toColumnName(column)),
    ];
    const insertValues = [
      tenantId ?? null,
      metricDate,
      occurredOn,
      ...ALL_COLUMNS.map((column) => payload[column]),
    ];
    const insertPlaceholders = insertValues.map((_, index) => `$${index + 1}`);

    const updateAssignments = ALL_COLUMNS.map((column) => {
      const columnName = this.toColumnName(column);
      if (column === 'aiLatencyMax') {
        return `${columnName} = GREATEST(${columnName}, EXCLUDED.${columnName})`;
      }
      return `${columnName} = ${columnName} + EXCLUDED.${columnName}`;
    });
    updateAssignments.push('last_updated_at = EXCLUDED.last_updated_at');

    const sql = `INSERT INTO anamnesis_metrics (${insertColumns.join(', ')})
      VALUES (${insertPlaceholders.join(', ')})
      ON CONFLICT (tenant_id, metric_date) DO UPDATE
      SET ${updateAssignments.join(', ')};`;

    await this.dataSource.query(sql, insertValues);
  }

  async getAggregate(tenantId?: string | null): Promise<MetricsAggregate | null> {
    const query = this.dataSource
      .createQueryBuilder()
      .select(this.buildAggregateSelect())
      .from(AnamnesisMetricEntity, 'metrics');

    if (tenantId) {
      query.where('metrics.tenantId = :tenantId', { tenantId });
    } else if (tenantId === null) {
      query.where('metrics.tenantId IS NULL');
    }

    const result = await query.getRawOne<Record<string, unknown> | undefined>();
    if (!result) {
      return null;
    }

    return this.normaliseAggregate(result);
  }

  async getAggregateForRange(
    tenantId: string | null | undefined,
    from: Date,
    to: Date,
  ): Promise<MetricsAggregate | null> {
    const query = this.dataSource
      .createQueryBuilder()
      .select(this.buildAggregateSelect())
      .from(AnamnesisMetricEntity, 'metrics')
      .where('metrics.metricDate BETWEEN :from AND :to', {
        from: this.toDateOnly(from),
        to: this.toDateOnly(to),
      });

    if (tenantId) {
      query.andWhere('metrics.tenantId = :tenantId', { tenantId });
    } else if (tenantId === null) {
      query.andWhere('metrics.tenantId IS NULL');
    }

    const result = await query.getRawOne<Record<string, unknown> | undefined>();
    if (!result) {
      return null;
    }

    return this.normaliseAggregate(result);
  }

  private buildAggregateSelect(): string[] {
    return [
      ...ALL_COLUMNS.map((column) => `${this.toAggregateExpression(column)} AS "${column}"`),
      'MAX(metrics.lastUpdatedAt) AS "lastUpdatedAt"',
    ];
  }

  private toAggregateExpression(column: ColumnKey): string {
    const columnName = `metrics.${this.toColumnName(column, false)}`;

    if (column === 'aiLatencyMax') {
      return `COALESCE(MAX(${columnName}), 0)`;
    }

    return `COALESCE(SUM(${columnName}), 0)`;
  }

  private buildPayload(increments: IncrementMetricsInput['increments']): Record<ColumnKey, number> {
    const payload: Record<ColumnKey, number> = {} as Record<ColumnKey, number>;

    ALL_COLUMNS.forEach((column) => {
      payload[column] = this.resolveIncrementValue(column, increments);
    });

    return payload;
  }

  private resolveIncrementValue(
    column: ColumnKey,
    increments: IncrementMetricsInput['increments'],
  ): number {
    const value = (increments as Record<string, number | undefined>)[column];
    if (value === undefined || Number.isNaN(value)) {
      return 0;
    }

    if (NUMERIC_COLUMNS.includes(column)) {
      return Number(value);
    }

    if (BIGINT_COLUMNS.includes(column)) {
      return Math.trunc(value);
    }

    if (INTEGER_COLUMNS.includes(column)) {
      return Math.trunc(value);
    }

    return Number(value);
  }

  private toColumnName(column: ColumnKey, quoted = true): string {
    const map: Record<ColumnKey, string> = {
      stepsSaved: 'steps_saved',
      autoSaves: 'auto_saves',
      completedSteps: 'completed_steps',
      stepCompletionRateSum: 'step_completion_rate_sum',
      stepCompletionRateCount: 'step_completion_rate_count',
      submissions: 'submissions',
      submissionCompletionRateSum: 'submission_completion_rate_sum',
      aiCompleted: 'ai_completed',
      aiFailed: 'ai_failed',
      aiConfidenceSum: 'ai_confidence_sum',
      aiConfidenceCount: 'ai_confidence_count',
      tokensInputSum: 'tokens_input_sum',
      tokensOutputSum: 'tokens_output_sum',
      aiLatencySum: 'ai_latency_sum',
      aiLatencyCount: 'ai_latency_count',
      aiLatencyMax: 'ai_latency_max',
      aiCostSum: 'ai_cost_sum',
      feedbackTotal: 'feedback_total',
      feedbackApprovals: 'feedback_approvals',
      feedbackModifications: 'feedback_modifications',
      feedbackRejections: 'feedback_rejections',
      feedbackLikes: 'feedback_likes',
      feedbackDislikes: 'feedback_dislikes',
    };

    const columnName = map[column];
    if (quoted) {
      return `"${columnName}"`;
    }
    return columnName;
  }

  private toDateOnly(date: Date): string {
    const utc = new Date(date);
    const year = utc.getUTCFullYear();
    const month = `${utc.getUTCMonth() + 1}`.padStart(2, '0');
    const day = `${utc.getUTCDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private normaliseAggregate(raw: Record<string, unknown>): MetricsAggregate {
    const normalised: Partial<MetricsAggregate> = {};

    NUMERIC_COLUMNS.forEach((column) => {
      const value = raw[column as string];
      normalised[column] = Number(value ?? 0);
    });

    BIGINT_COLUMNS.forEach((column) => {
      const value = raw[column as string];
      normalised[column] =
        typeof value === 'string' ? Number.parseInt(value, 10) : Number(value ?? 0);
    });

    INTEGER_COLUMNS.forEach((column) => {
      const value = raw[column as string];
      normalised[column] = typeof value === 'number' ? value : Number(value ?? 0);
    });

    if (raw['lastUpdatedAt'] instanceof Date) {
      normalised.lastUpdatedAt = raw['lastUpdatedAt'] as Date;
    } else if (typeof raw['lastUpdatedAt'] === 'string') {
      normalised.lastUpdatedAt = new Date(raw['lastUpdatedAt'] as string);
    } else {
      normalised.lastUpdatedAt = null;
    }

    return normalised as MetricsAggregate;
  }
}
