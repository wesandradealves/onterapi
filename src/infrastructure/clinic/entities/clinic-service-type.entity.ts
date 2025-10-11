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

import {
  ClinicCancellationPolicy,
  ClinicServiceCustomField,
  ClinicServiceEligibility,
} from '../../../domain/clinic/types/clinic.types';
import { ClinicEntity } from './clinic.entity';

@Entity('clinic_service_types')
@Index(['clinicId', 'slug'], { unique: true })
@Index(['clinicId', 'isActive'])
export class ClinicServiceTypeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'clinic_id', type: 'uuid' })
  clinicId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'name', type: 'varchar', length: 160 })
  name!: string;

  @Column({ name: 'slug', type: 'varchar', length: 180 })
  slug!: string;

  @Column({ name: 'color', type: 'varchar', length: 16, nullable: true })
  color?: string | null;

  @Column({ name: 'duration_minutes', type: 'integer' })
  durationMinutes!: number;

  @Column({ name: 'price', type: 'numeric', precision: 12, scale: 2 })
  price!: number;

  @Column({ name: 'currency', type: 'varchar', length: 3 })
  currency!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'requires_anamnesis', type: 'boolean', default: false })
  requiresAnamnesis!: boolean;

  @Column({ name: 'enable_online_scheduling', type: 'boolean', default: true })
  enableOnlineScheduling!: boolean;

  @Column({ name: 'min_advance_minutes', type: 'integer' })
  minAdvanceMinutes!: number;

  @Column({ name: 'max_advance_minutes', type: 'integer', nullable: true })
  maxAdvanceMinutes?: number | null;

  @Column({ name: 'cancellation_policy', type: 'jsonb' })
  cancellationPolicy!: ClinicCancellationPolicy;

  @Column({ name: 'eligibility', type: 'jsonb' })
  eligibility!: ClinicServiceEligibility;

  @Column({ name: 'instructions', type: 'text', nullable: true })
  instructions?: string | null;

  @Column({ name: 'required_documents', type: 'jsonb', default: () => "'[]'" })
  requiredDocuments!: string[];

  @Column({ name: 'custom_fields', type: 'jsonb', default: () => "'[]'" })
  customFields!: ClinicServiceCustomField[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @Column({ name: 'archived_at', type: 'timestamp with time zone', nullable: true })
  archivedAt?: Date | null;

  @ManyToOne(() => ClinicEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinic_id' })
  clinic?: ClinicEntity;
}
