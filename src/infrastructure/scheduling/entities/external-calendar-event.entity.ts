import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { ExternalCalendarEventStatus } from '../../../domain/scheduling/types/scheduling.types';

@Entity('scheduling_external_calendar_events')
@Index(['tenantId', 'professionalId', 'externalId'], { unique: true })
export class ExternalCalendarEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'professional_id', type: 'uuid' })
  professionalId!: string;

  @Column({ name: 'source', type: 'varchar', length: 40 })
  source!: string;

  @Column({ name: 'external_id', type: 'varchar', length: 128 })
  externalId!: string;

  @Column({ name: 'start_at_utc', type: 'timestamp with time zone' })
  startAtUtc!: Date;

  @Column({ name: 'end_at_utc', type: 'timestamp with time zone' })
  endAtUtc!: Date;

  @Column({ name: 'timezone', type: 'varchar', length: 64 })
  timezone!: string;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'pending' })
  status!: ExternalCalendarEventStatus;

  @Column({ name: 'validation_errors', type: 'jsonb', nullable: true })
  validationErrors?: string[] | null;

  @Column({ name: 'resource_id', type: 'uuid', nullable: true })
  resourceId?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
