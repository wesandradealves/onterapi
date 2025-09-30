import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { AnamnesisStatus } from '../../../domain/anamnesis/types/anamnesis.types';
import { AnamnesisStepEntity } from './anamnesis-step.entity';
import { AnamnesisTherapeuticPlanEntity } from './anamnesis-therapeutic-plan.entity';
import { AnamnesisAIAnalysisEntity } from './anamnesis-ai-analysis.entity';
import { AnamnesisAttachmentEntity } from './anamnesis-attachment.entity';

@Entity('anamneses')
@Index(['tenantId', 'consultationId'], { unique: true })
@Index(['tenantId', 'patientId'])
@Index(['tenantId', 'professionalId'])
@Index(['tenantId', 'status'])
export class AnamnesisEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'consultation_id', type: 'uuid' })
  consultationId!: string;

  @Column({ name: 'patient_id', type: 'uuid' })
  patientId!: string;

  @Column({ name: 'professional_id', type: 'uuid' })
  professionalId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'draft' })
  status!: AnamnesisStatus;

  @Column({ name: 'total_steps', type: 'smallint', default: 10 })
  totalSteps!: number;

  @Column({ name: 'current_step', type: 'smallint', default: 1 })
  currentStep!: number;

  @Column({ name: 'completion_rate', type: 'numeric', precision: 5, scale: 2, default: 0 })
  completionRate!: number;

  @Column({ name: 'is_draft', type: 'boolean', default: true })
  isDraft!: boolean;

  @Column({ name: 'last_auto_saved_at', type: 'timestamp with time zone', nullable: true })
  lastAutoSavedAt?: Date;

  @Column({ name: 'submitted_at', type: 'timestamp with time zone', nullable: true })
  submittedAt?: Date;

  @Column({ name: 'completed_at', type: 'timestamp with time zone', nullable: true })
  completedAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp with time zone', nullable: true })
  deletedAt?: Date | null;

  @Column({ name: 'deleted_by', type: 'uuid', nullable: true })
  deletedBy?: string | null;

  @Column({ name: 'deleted_reason', type: 'text', nullable: true })
  deletedReason?: string | null;

  @OneToMany(() => AnamnesisStepEntity, (step) => step.anamnesis, {
    cascade: ['insert', 'update'],
  })
  steps?: AnamnesisStepEntity[];

  @OneToMany(() => AnamnesisTherapeuticPlanEntity, (plan) => plan.anamnesis, {
    cascade: ['insert', 'update'],
  })
  plans?: AnamnesisTherapeuticPlanEntity[];

  @OneToMany(() => AnamnesisAttachmentEntity, (attachment) => attachment.anamnesis, {
    cascade: ['insert', 'update'],
  })
  attachments?: AnamnesisAttachmentEntity[];

  @OneToMany(() => AnamnesisAIAnalysisEntity, (analysis) => analysis.anamnesis, {
    cascade: ['insert', 'update'],
  })
  aiAnalyses?: AnamnesisAIAnalysisEntity[];
}
