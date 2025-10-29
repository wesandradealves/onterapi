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

import { ClinicMemberStatus, ClinicStaffRole } from '../../../domain/clinic/types/clinic.types';
import { ClinicEntity } from './clinic.entity';

@Entity('clinic_members')
@Index(['tenantId', 'userId'])
@Index(['clinicId', 'role'])
@Index(['clinicId', 'status'])
@Index(['clinicId', 'userId'], {
  unique: true,
  where: '"ended_at" IS NULL',
})
export class ClinicMemberEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'clinic_id', type: 'uuid' })
  clinicId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'role', type: 'varchar', length: 30 })
  role!: ClinicStaffRole;

  @Column({ name: 'status', type: 'varchar', length: 30 })
  status!: ClinicMemberStatus;

  @Column({ name: 'scope', type: 'jsonb', default: () => "'[]'" })
  scope!: string[];

  @Column({ name: 'preferences', type: 'jsonb', default: () => "'{}'" })
  preferences!: Record<string, unknown>;

  @Column({
    name: 'joined_at',
    type: 'timestamp with time zone',
    default: 'now()',
  })
  joinedAt?: Date;

  @Column({ name: 'suspended_at', type: 'timestamp with time zone', nullable: true })
  suspendedAt?: Date | null;

  @Column({ name: 'ended_at', type: 'timestamp with time zone', nullable: true })
  endedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @ManyToOne(() => ClinicEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinic_id' })
  clinic?: ClinicEntity;
}
