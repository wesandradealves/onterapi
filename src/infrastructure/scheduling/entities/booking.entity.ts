import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

import {
  BookingSource,
  BookingStatus,
  CancellationReason,
  PaymentStatus,
  PricingSplit,
} from '../../../domain/scheduling/types/scheduling.types';

@Entity('scheduling_bookings')
@Index(['tenantId', 'professionalId', 'startAtUtc'])
@Index(['tenantId', 'clinicId', 'startAtUtc'])
@Index(['tenantId', 'patientId'])
@Index(['tenantId', 'status'])
export class BookingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'clinic_id', type: 'uuid' })
  clinicId!: string;

  @Column({ name: 'professional_id', type: 'uuid' })
  professionalId!: string;

  @Column({ name: 'patient_id', type: 'uuid' })
  patientId!: string;

  @Column({ name: 'source', type: 'varchar', length: 40 })
  source!: BookingSource;

  @Column({ name: 'status', type: 'varchar', length: 30 })
  status!: BookingStatus;

  @Column({ name: 'payment_status', type: 'varchar', length: 30 })
  paymentStatus!: PaymentStatus;

  @Column({ name: 'hold_id', type: 'uuid', nullable: true })
  holdId?: string | null;

  @Column({ name: 'hold_expires_at', type: 'timestamp with time zone', nullable: true })
  holdExpiresAtUtc?: Date | null;

  @Column({ name: 'start_at_utc', type: 'timestamp with time zone' })
  startAtUtc!: Date;

  @Column({ name: 'end_at_utc', type: 'timestamp with time zone' })
  endAtUtc!: Date;

  @Column({ name: 'timezone', type: 'varchar', length: 64 })
  timezone!: string;

  @Column({ name: 'late_tolerance_minutes', type: 'integer', default: 15 })
  lateToleranceMinutes!: number;

  @Column({ name: 'recurrence_series_id', type: 'uuid', nullable: true })
  recurrenceSeriesId?: string | null;

  @Column({ name: 'cancellation_reason', type: 'varchar', length: 40, nullable: true })
  cancellationReason?: CancellationReason | null;

  @Column({ name: 'pricing_split', type: 'jsonb', nullable: true })
  pricingSplit?: PricingSplit | null;

  @Column({ name: 'preconditions_passed', type: 'boolean', default: false })
  preconditionsPassed!: boolean;

  @Column({ name: 'anamnese_required', type: 'boolean', default: false })
  anamneseRequired!: boolean;

  @Column({ name: 'anamnese_override_reason', type: 'text', nullable: true })
  anamneseOverrideReason?: string | null;

  @Column({ name: 'no_show_marked_at', type: 'timestamp with time zone', nullable: true })
  noShowMarkedAtUtc?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @VersionColumn({ name: 'version', type: 'integer', default: 1 })
  version!: number;
}
