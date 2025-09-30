import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { AnamnesisEntity } from './anamnesis.entity';
import { AnamnesisAIAnalysisEntity } from './anamnesis-ai-analysis.entity';

@Entity('anamnesis_therapeutic_plans')
@Index(['anamnesisId', 'createdAt'])
export class AnamnesisTherapeuticPlanEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'anamnesis_id', type: 'uuid' })
  anamnesisId!: string;

  @Column({ name: 'analysis_id', type: 'uuid', nullable: true })
  analysisId?: string | null;

  @ManyToOne(() => AnamnesisAIAnalysisEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'analysis_id' })
  analysis?: AnamnesisAIAnalysisEntity | null;

  @Column({ name: 'clinical_reasoning', type: 'text', nullable: true })
  clinicalReasoning?: string;

  @Column({ name: 'summary', type: 'text', nullable: true })
  summary?: string;

  @Column({ name: 'therapeutic_plan', type: 'jsonb', nullable: true })
  therapeuticPlan?: unknown;

  @Column({ name: 'risk_factors', type: 'jsonb', nullable: true })
  riskFactors?: unknown;

  @Column({ name: 'recommendations', type: 'jsonb', nullable: true })
  recommendations?: unknown;

  @Column({ name: 'confidence', type: 'numeric', precision: 5, scale: 2, nullable: true })
  confidence?: number;

  @Column({ name: 'review_required', type: 'boolean', default: false })
  reviewRequired!: boolean;

  @Column({ name: 'terms_accepted', type: 'boolean', default: false })
  termsAccepted!: boolean;

  @Column({ name: 'approval_status', type: 'varchar', length: 16, default: 'pending' })
  approvalStatus!: 'pending' | 'approved' | 'modified' | 'rejected';

  @Column({ name: 'liked', type: 'boolean', nullable: true })
  liked?: boolean;

  @Column({ name: 'feedback_comment', type: 'text', nullable: true })
  feedbackComment?: string;

  @Column({ name: 'feedback_given_by', type: 'uuid', nullable: true })
  feedbackGivenBy?: string;

  @Column({ name: 'feedback_given_at', type: 'timestamp with time zone', nullable: true })
  feedbackGivenAt?: Date;

  @Column({ name: 'generated_at', type: 'timestamp with time zone' })
  generatedAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @ManyToOne(() => AnamnesisEntity, (anamnesis) => anamnesis.plans, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'anamnesis_id' })
  anamnesis!: AnamnesisEntity;
}
