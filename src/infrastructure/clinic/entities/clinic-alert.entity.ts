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

import { ClinicAlertChannel, ClinicAlertType } from '../../../domain/clinic/types/clinic.types';
import { ClinicEntity } from './clinic.entity';

@Entity('clinic_alerts')
@Index(['clinicId', 'type'])
@Index(['tenantId', 'type'])
@Index(['clinicId', 'resolvedAt'])
export class ClinicAlertEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'clinic_id', type: 'uuid' })
  clinicId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'type', type: 'varchar', length: 50 })
  type!: ClinicAlertType;

  @Column({ name: 'channel', type: 'varchar', length: 20 })
  channel!: ClinicAlertChannel;

  @Column({ name: 'triggered_by', type: 'uuid' })
  triggeredBy!: string;

  @CreateDateColumn({ name: 'triggered_at', type: 'timestamp with time zone' })
  triggeredAt!: Date;

  @Column({ name: 'resolved_at', type: 'timestamp with time zone', nullable: true })
  resolvedAt?: Date | null;

  @Column({ name: 'resolved_by', type: 'uuid', nullable: true })
  resolvedBy?: string | null;

  @Column({ name: 'payload', type: 'jsonb', default: () => "'{}'" })
  payload!: Record<string, unknown>;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @ManyToOne(() => ClinicEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinic_id' })
  clinic?: ClinicEntity;
}
