import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

import { ClinicHold } from '../../../domain/clinic/types/clinic.types';
import { ClinicEntity } from './clinic.entity';

type ClinicHoldStatus = ClinicHold['status'];

@Entity('clinic_holds')
@Index(['clinicId', 'tenantId', 'status'])
@Index(['clinicId', 'tenantId', 'ttlExpiresAt'])
@Index(['tenantId', 'professionalId', 'status'])
@Index(['clinicId', 'tenantId', 'idempotencyKey'], { unique: true })
export class ClinicHoldEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'clinic_id', type: 'uuid' })
  clinicId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'professional_id', type: 'uuid' })
  professionalId!: string;

  @Column({ name: 'patient_id', type: 'uuid' })
  patientId!: string;

  @Column({ name: 'service_type_id', type: 'uuid' })
  serviceTypeId!: string;

  @Column({ name: 'start_at', type: 'timestamp with time zone' })
  start!: Date;

  @Column({ name: 'end_at', type: 'timestamp with time zone' })
  end!: Date;

  @Column({ name: 'ttl_expires_at', type: 'timestamp with time zone' })
  ttlExpiresAt!: Date;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'pending' })
  status!: ClinicHoldStatus;

  @Column({ name: 'location_id', type: 'uuid', nullable: true })
  locationId?: string | null;

  @Column({ name: 'resources', type: 'jsonb', default: () => "'[]'" })
  resources!: string[];

  @Column({ name: 'idempotency_key', type: 'varchar', length: 120 })
  idempotencyKey!: string;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @Column({ name: 'confirmed_at', type: 'timestamp with time zone', nullable: true })
  confirmedAt?: Date | null;

  @Column({ name: 'confirmed_by', type: 'uuid', nullable: true })
  confirmedBy?: string | null;

  @Column({ name: 'cancelled_at', type: 'timestamp with time zone', nullable: true })
  cancelledAt?: Date | null;

  @Column({ name: 'cancelled_by', type: 'uuid', nullable: true })
  cancelledBy?: string | null;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason?: string | null;

  @Column({ name: 'metadata', type: 'jsonb', default: () => "'{}'" })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @VersionColumn({ name: 'version', type: 'integer', default: 1 })
  version!: number;

  @ManyToOne(() => ClinicEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinic_id' })
  clinic?: ClinicEntity;
}
