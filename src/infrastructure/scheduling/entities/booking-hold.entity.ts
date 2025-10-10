import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

import { HoldStatus } from '../../../domain/scheduling/types/scheduling.types';

@Entity('scheduling_booking_holds')
@Index(['tenantId', 'professionalId', 'startAtUtc'])
export class BookingHoldEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'professional_id', type: 'uuid' })
  professionalId!: string;

  @Column({ name: 'clinic_id', type: 'uuid' })
  clinicId!: string;

  @Column({ name: 'patient_id', type: 'uuid' })
  patientId!: string;

  @Column({ name: 'start_at_utc', type: 'timestamp with time zone' })
  startAtUtc!: Date;

  @Column({ name: 'end_at_utc', type: 'timestamp with time zone' })
  endAtUtc!: Date;

  @Column({ name: 'ttl_expires_at_utc', type: 'timestamp with time zone' })
  ttlExpiresAtUtc!: Date;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'active' })
  status!: HoldStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @VersionColumn({ name: 'version', type: 'integer', default: 1 })
  version!: number;
}
