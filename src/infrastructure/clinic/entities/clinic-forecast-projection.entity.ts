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

@Entity('clinic_forecast_projections')
@Index(['clinicId', 'month'], { unique: true })
@Index(['tenantId', 'month'])
export class ClinicForecastProjectionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'clinic_id', type: 'uuid' })
  clinicId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'month', type: 'varchar', length: 7 })
  month!: string;

  @Column({ name: 'projected_revenue', type: 'numeric', precision: 14, scale: 2, default: '0' })
  projectedRevenue!: number;

  @Column({ name: 'projected_appointments', type: 'integer', default: 0 })
  projectedAppointments!: number;

  @Column({
    name: 'projected_occupancy_rate',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: '0',
  })
  projectedOccupancyRate!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @ManyToOne(() => ClinicEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinic_id' })
  clinic?: ClinicEntity;
}
