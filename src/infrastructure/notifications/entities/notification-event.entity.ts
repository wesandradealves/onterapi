import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { NotificationEventStatus } from '../../../domain/notifications/types/notification.types';

@Entity('notification_events')
export class NotificationEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'event_name', type: 'varchar', length: 150 })
  eventName!: string;

  @Column({ name: 'aggregate_id', type: 'varchar', length: 150 })
  aggregateId!: string;

  @Column({ name: 'payload', type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Column({ name: 'recipients', type: 'jsonb', default: () => "'[]'" })
  recipients!: string[];

  @Column({ name: 'channels', type: 'text', array: true, default: () => "'{}'" })
  channels!: string[];

  @Column({ name: 'status', type: 'varchar', length: 30, default: 'queued' })
  status!: NotificationEventStatus;

  @Column({ name: 'queued_at', type: 'timestamp with time zone' })
  queuedAt!: Date;

  @Column({ name: 'processed_at', type: 'timestamp with time zone', nullable: true })
  processedAt?: Date | null;

  @Column({ name: 'error_detail', type: 'jsonb', nullable: true })
  errorDetail?: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
