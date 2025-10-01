import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { AnamnesisTherapeuticPlanEntity } from './anamnesis-therapeutic-plan.entity';
import { AnamnesisEntity } from './anamnesis.entity';

@Entity('therapeutic_plan_access_logs')
@Index(['tenantId', 'planId'])
@Index(['tenantId', 'anamnesisId'])
export class TherapeuticPlanAccessLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'anamnesis_id', type: 'uuid' })
  anamnesisId!: string;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId!: string;

  @Column({ name: 'professional_id', type: 'uuid' })
  professionalId!: string;

  @Column({ name: 'viewer_role', type: 'varchar', length: 32 })
  viewerRole!: string;

  @Column({ name: 'viewed_at', type: 'timestamp with time zone', default: () => 'NOW()' })
  viewedAt!: Date;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress?: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @ManyToOne(() => AnamnesisEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'anamnesis_id' })
  anamnesis?: AnamnesisEntity;

  @ManyToOne(() => AnamnesisTherapeuticPlanEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan?: AnamnesisTherapeuticPlanEntity;
}
