import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('anamnesis_metrics')
@Index(['tenantId', 'metricDate'], { unique: true })
export class AnamnesisMetricEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId?: string | null;

  @Column({ name: 'metric_date', type: 'date' })
  metricDate!: string;

  @Column({ name: 'steps_saved', type: 'integer', default: 0 })
  stepsSaved!: number;

  @Column({ name: 'auto_saves', type: 'integer', default: 0 })
  autoSaves!: number;

  @Column({ name: 'completed_steps', type: 'integer', default: 0 })
  completedSteps!: number;

  @Column({ name: 'step_completion_rate_sum', type: 'numeric', precision: 14, scale: 6, default: 0 })
  stepCompletionRateSum!: string;

  @Column({ name: 'step_completion_rate_count', type: 'integer', default: 0 })
  stepCompletionRateCount!: number;

  @Column({ name: 'submissions', type: 'integer', default: 0 })
  submissions!: number;

  @Column({
    name: 'submission_completion_rate_sum',
    type: 'numeric',
    precision: 14,
    scale: 6,
    default: 0,
  })
  submissionCompletionRateSum!: string;

  @Column({ name: 'ai_completed', type: 'integer', default: 0 })
  aiCompleted!: number;

  @Column({ name: 'ai_failed', type: 'integer', default: 0 })
  aiFailed!: number;

  @Column({ name: 'ai_confidence_sum', type: 'numeric', precision: 14, scale: 6, default: 0 })
  aiConfidenceSum!: string;

  @Column({ name: 'ai_confidence_count', type: 'integer', default: 0 })
  aiConfidenceCount!: number;

  @Column({ name: 'tokens_input_sum', type: 'bigint', default: 0 })
  tokensInputSum!: string;

  @Column({ name: 'tokens_output_sum', type: 'bigint', default: 0 })
  tokensOutputSum!: string;

  @Column({ name: 'ai_latency_sum', type: 'bigint', default: 0 })
  aiLatencySum!: string;

  @Column({ name: 'ai_latency_count', type: 'integer', default: 0 })
  aiLatencyCount!: number;

  @Column({ name: 'ai_latency_max', type: 'integer', default: 0 })
  aiLatencyMax!: number;

  @Column({ name: 'ai_cost_sum', type: 'numeric', precision: 18, scale: 8, default: 0 })
  aiCostSum!: string;

  @Column({ name: 'feedback_total', type: 'integer', default: 0 })
  feedbackTotal!: number;

  @Column({ name: 'feedback_approvals', type: 'integer', default: 0 })
  feedbackApprovals!: number;

  @Column({ name: 'feedback_modifications', type: 'integer', default: 0 })
  feedbackModifications!: number;

  @Column({ name: 'feedback_rejections', type: 'integer', default: 0 })
  feedbackRejections!: number;

  @Column({ name: 'feedback_likes', type: 'integer', default: 0 })
  feedbackLikes!: number;

  @Column({ name: 'feedback_dislikes', type: 'integer', default: 0 })
  feedbackDislikes!: number;

  @Column({ name: 'last_updated_at', type: 'timestamp with time zone', nullable: true })
  lastUpdatedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
