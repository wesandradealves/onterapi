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

import { ClinicEntity } from './clinic.entity';

@Entity('clinic_dashboard_metrics')
@Index(['clinicId', 'month'], { unique: true })
@Index(['tenantId', 'month'])
export class ClinicDashboardMetricEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'clinic_id', type: 'uuid' })
  clinicId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'month', type: 'varchar', length: 7 })
  month!: string;

  @Column({ name: 'revenue', type: 'numeric', precision: 14, scale: 2, default: '0' })
  revenue!: number;

  @Column({ name: 'appointments', type: 'integer', default: 0 })
  appointments!: number;

  @Column({ name: 'active_patients', type: 'integer', default: 0 })
  activePatients!: number;

  @Column({ name: 'occupancy_rate', type: 'numeric', precision: 5, scale: 2, default: '0' })
  occupancyRate!: number;

  @Column({
    name: 'satisfaction_score',
    type: 'numeric',
    precision: 4,
    scale: 2,
    nullable: true,
  })
  satisfactionScore?: number;

  @Column({
    name: 'contribution_margin',
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  contributionMargin?: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @ManyToOne(() => ClinicEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinic_id' })
  clinic?: ClinicEntity;
}
