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

import { ClinicProfessionalCoverageStatus } from '../../../domain/clinic/types/clinic.types';
import { ClinicEntity } from './clinic.entity';

@Entity('clinic_professional_coverages')
@Index(['tenantId', 'clinicId'])
@Index(['clinicId', 'professionalId'])
@Index(['clinicId', 'coverageProfessionalId'])
@Index(['tenantId', 'professionalId'])
@Index(['tenantId', 'coverageProfessionalId'])
@Index(['clinicId', 'status'])
@Index(['clinicId', 'startAt'])
export class ClinicProfessionalCoverageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'clinic_id', type: 'uuid' })
  clinicId!: string;

  @Column({ name: 'professional_id', type: 'uuid' })
  professionalId!: string;

  @Column({ name: 'coverage_professional_id', type: 'uuid' })
  coverageProfessionalId!: string;

  @Column({ name: 'start_at', type: 'timestamp with time zone' })
  startAt!: Date;

  @Column({ name: 'end_at', type: 'timestamp with time zone' })
  endAt!: Date;

  @Column({ name: 'status', type: 'varchar', length: 30 })
  status!: ClinicProfessionalCoverageStatus;

  @Column({ name: 'reason', type: 'varchar', length: 255, nullable: true })
  reason?: string | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string | null;

  @Column({ name: 'metadata', type: 'jsonb', default: () => "'{}'" })
  metadata!: Record<string, unknown>;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string | null;

  @Column({ name: 'cancelled_at', type: 'timestamp with time zone', nullable: true })
  cancelledAt?: Date | null;

  @Column({ name: 'cancelled_by', type: 'uuid', nullable: true })
  cancelledBy?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @ManyToOne(() => ClinicEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinic_id' })
  clinic?: ClinicEntity;
}
