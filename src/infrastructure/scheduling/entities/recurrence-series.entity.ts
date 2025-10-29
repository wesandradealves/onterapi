import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import {
  HolidayPolicy,
  RecurrencePatternType,
} from '../../../domain/scheduling/types/scheduling.types';

@Entity('scheduling_recurrence_series')
@Index(['tenantId', 'professionalId'])
export class RecurrenceSeriesEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'professional_id', type: 'uuid' })
  professionalId!: string;

  @Column({ name: 'clinic_id', type: 'uuid' })
  clinicId!: string;

  @Column({ name: 'pattern', type: 'varchar', length: 30 })
  pattern!: RecurrencePatternType;

  @Column({ name: 'pattern_value', type: 'varchar', length: 100 })
  patternValue!: string;

  @Column({ name: 'start_date_utc', type: 'timestamp with time zone' })
  startDateUtc!: Date;

  @Column({ name: 'end_date_utc', type: 'timestamp with time zone', nullable: true })
  endDateUtc?: Date | null;

  @Column({ name: 'skip_holidays', type: 'boolean', default: true })
  skipHolidays!: boolean;

  @Column({ name: 'holiday_policy', type: 'varchar', length: 10, default: 'skip' })
  holidayPolicy!: HolidayPolicy;

  @Column({ name: 'max_reschedules_per_occurrence', type: 'integer', default: 1 })
  maxReschedulesPerOccurrence!: number;

  @Column({ name: 'max_reschedules_per_series', type: 'integer', default: 3 })
  maxReschedulesPerSeries!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
