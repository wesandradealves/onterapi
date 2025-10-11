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

import { AnamnesisStepKey } from '../../../domain/anamnesis/types/anamnesis.types';
import { AnamnesisEntity } from './anamnesis.entity';

@Entity('anamnesis_steps')
@Index(['anamnesisId', 'stepNumber'], { unique: true })
export class AnamnesisStepEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'anamnesis_id', type: 'uuid' })
  anamnesisId!: string;

  @Column({ name: 'step_number', type: 'smallint' })
  stepNumber!: number;

  @Column({ name: 'key', type: 'varchar', length: 64 })
  key!: AnamnesisStepKey;

  @Column({ name: 'payload', type: 'jsonb', default: () => "'{}'::jsonb" })
  payload!: Record<string, unknown>;

  @Column({ name: 'completed', type: 'boolean', default: false })
  completed!: boolean;

  @Column({ name: 'has_errors', type: 'boolean', default: false })
  hasErrors!: boolean;

  @Column({ name: 'validation_score', type: 'numeric', precision: 5, scale: 2, nullable: true })
  validationScore?: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @ManyToOne(() => AnamnesisEntity, (anamnesis) => anamnesis.steps, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'anamnesis_id' })
  anamnesis!: AnamnesisEntity;
}
