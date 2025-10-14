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

@Entity('clinic_financial_snapshots')
@Index(['clinicId', 'month'], { unique: true })
@Index(['tenantId', 'month'])
export class ClinicFinancialSnapshotEntity {
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

  @Column({ name: 'expenses', type: 'numeric', precision: 14, scale: 2, default: '0' })
  expenses!: number;

  @Column({ name: 'profit', type: 'numeric', precision: 14, scale: 2, default: '0' })
  profit!: number;

  @Column({ name: 'margin', type: 'numeric', precision: 5, scale: 2, default: '0' })
  margin!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @ManyToOne(() => ClinicEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinic_id' })
  clinic?: ClinicEntity;
}
