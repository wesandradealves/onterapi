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

import {
  ClinicAppointmentStatus,
  ClinicPaymentStatus,
} from '../../../domain/clinic/types/clinic.types';
import { ClinicEntity } from './clinic.entity';
import { ClinicHoldEntity } from './clinic-hold.entity';

@Entity('clinic_appointments')
@Index(['tenantId', 'professionalId', 'status'])
@Index(['clinicId', 'startAt'])
@Index(['clinicId', 'paymentStatus'])
export class ClinicAppointmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'clinic_id', type: 'uuid' })
  clinicId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'hold_id', type: 'uuid', unique: true })
  holdId!: string;

  @Column({ name: 'professional_id', type: 'uuid' })
  professionalId!: string;

  @Column({ name: 'patient_id', type: 'uuid' })
  patientId!: string;

  @Column({ name: 'service_type_id', type: 'uuid' })
  serviceTypeId!: string;

  @Column({ name: 'start_at', type: 'timestamp with time zone' })
  startAt!: Date;

  @Column({ name: 'end_at', type: 'timestamp with time zone' })
  endAt!: Date;

  @Column({ name: 'status', type: 'varchar', length: 20 })
  status!: ClinicAppointmentStatus;

  @Column({ name: 'payment_status', type: 'varchar', length: 20 })
  paymentStatus!: ClinicPaymentStatus;

  @Column({ name: 'payment_transaction_id', type: 'varchar', length: 120 })
  paymentTransactionId!: string;

  @Column({ name: 'confirmed_at', type: 'timestamp with time zone' })
  confirmedAt!: Date;

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

  @ManyToOne(() => ClinicHoldEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hold_id' })
  hold?: ClinicHoldEntity;
}
