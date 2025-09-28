import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { AnamnesisAIAnalysisEntity } from './anamnesis-ai-analysis.entity';
import { AnamnesisTherapeuticPlanEntity } from './anamnesis-therapeutic-plan.entity';

@Entity('anamnesis_ai_feedbacks')
@Index(['tenantId', 'analysisId'])
@Index(['tenantId', 'planId'])
export class AnamnesisAITrainingFeedbackEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'anamnesis_id', type: 'uuid' })
  anamnesisId!: string;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId!: string;

  @Column({ name: 'analysis_id', type: 'uuid', nullable: true })
  analysisId?: string | null;

  @Column({
    name: 'approval_status',
    type: 'varchar',
    length: 16,
  })
  approvalStatus!: 'approved' | 'modified' | 'rejected';

  @Column({ name: 'liked', type: 'boolean', nullable: true })
  liked?: boolean;

  @Column({ name: 'feedback_comment', type: 'text', nullable: true })
  feedbackComment?: string;

  @Column({ name: 'feedback_given_by', type: 'uuid' })
  feedbackGivenBy!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @ManyToOne(() => AnamnesisTherapeuticPlanEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'plan_id' })
  plan?: AnamnesisTherapeuticPlanEntity;

  @ManyToOne(() => AnamnesisAIAnalysisEntity, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'analysis_id' })
  analysis?: AnamnesisAIAnalysisEntity | null;
}
