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

import { ClinicConfigurationSection } from '../../../domain/clinic/types/clinic.types';
import { ClinicEntity } from './clinic.entity';

@Entity('clinic_config_versions')
@Index(['clinicId', 'section', 'version'], { unique: true })
@Index(['clinicId', 'section', 'createdAt'])
@Index(['clinicId', 'section', 'appliedAt'])
export class ClinicConfigurationVersionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'clinic_id', type: 'uuid' })
  clinicId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'section', type: 'varchar', length: 40 })
  section!: ClinicConfigurationSection;

  @Column({ name: 'version', type: 'integer' })
  version!: number;

  @Column({ name: 'payload', type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string | null;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @Column({ name: 'applied_at', type: 'timestamp with time zone', nullable: true })
  appliedAt?: Date | null;

  @Column({ name: 'auto_apply', type: 'boolean', default: false })
  autoApply!: boolean;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @ManyToOne(() => ClinicEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinic_id' })
  clinic?: ClinicEntity;
}
