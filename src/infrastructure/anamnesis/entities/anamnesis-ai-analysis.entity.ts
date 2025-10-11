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

@Entity('anamnesis_ai_analyses')
@Index(['tenantId', 'anamnesisId', 'createdAt'])
export class AnamnesisAIAnalysisEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'anamnesis_id', type: 'uuid' })
  anamnesisId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'status', type: 'varchar', length: 16, default: 'pending' })
  status!: string;

  @Column({ name: 'payload', type: 'jsonb', nullable: true })
  payload?: Record<string, unknown>;

  @Column({ name: 'clinical_reasoning', type: 'text', nullable: true })
  clinicalReasoning?: string;

  @Column({ name: 'summary', type: 'text', nullable: true })
  summary?: string;

  @Column({ name: 'risk_factors', type: 'jsonb', nullable: true })
  riskFactors?: Record<string, unknown>;

  @Column({ name: 'recommendations', type: 'jsonb', nullable: true })
  recommendations?: Record<string, unknown>;

  @Column({ name: 'confidence', type: 'numeric', precision: 5, scale: 2, nullable: true })
  confidence?: number;

  @Column({ name: 'generated_at', type: 'timestamp with time zone', nullable: true })
  generatedAt?: Date;

  @Column({ name: 'responded_at', type: 'timestamp with time zone', nullable: true })
  respondedAt?: Date;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ name: 'model', type: 'text', nullable: true })
  model?: string;

  @Column({ name: 'prompt_version', type: 'text', nullable: true })
  promptVersion?: string;

  @Column({ name: 'plan_text', type: 'text', nullable: true })
  planText?: string;

  @Column({ name: 'reasoning_text', type: 'text', nullable: true })
  reasoningText?: string;

  @Column({ name: 'evidence_map', type: 'jsonb', nullable: true })
  evidenceMap?: Record<string, unknown> | null;

  @Column({ name: 'tokens_input', type: 'integer', nullable: true })
  tokensInput?: number;

  @Column({ name: 'tokens_output', type: 'integer', nullable: true })
  tokensOutput?: number;

  @Column({ name: 'latency_ms', type: 'integer', nullable: true })
  latencyMs?: number;

  @Column({ name: 'raw_response', type: 'jsonb', nullable: true })
  rawResponse?: Record<string, unknown> | null;

  @ManyToOne(() => AnamnesisEntity, (anamnesis) => anamnesis.aiAnalyses, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'anamnesis_id' })
  anamnesis?: AnamnesisEntity;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
