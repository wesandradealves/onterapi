import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('scheduling_recurrence_occurrences')
@Index(['tenantId', 'seriesId', 'bookingId'], { unique: true })
export class RecurrenceOccurrenceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'series_id', type: 'uuid' })
  seriesId!: string;

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId!: string;

  @Column({ name: 'start_at_utc', type: 'timestamp with time zone' })
  startAtUtc!: Date;

  @Column({ name: 'end_at_utc', type: 'timestamp with time zone' })
  endAtUtc!: Date;

  @Column({ name: 'reschedules_count', type: 'integer', default: 0 })
  reschedulesCount!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
