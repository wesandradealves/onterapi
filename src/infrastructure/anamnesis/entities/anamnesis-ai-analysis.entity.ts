import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
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

  @ManyToOne(() => AnamnesisEntity, (anamnesis) => anamnesis.aiAnalyses, {
    onDelete: 'CASCADE',
  })
  anamnesis?: AnamnesisEntity;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
