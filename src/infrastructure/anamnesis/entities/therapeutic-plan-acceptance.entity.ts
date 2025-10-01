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

import { AnamnesisTherapeuticPlanEntity } from './anamnesis-therapeutic-plan.entity';

@Entity('therapeutic_plan_acceptances')
@Index(['tenantId', 'therapeuticPlanId'])
@Index(['tenantId', 'professionalId'])
export class TherapeuticPlanAcceptanceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'therapeutic_plan_id', type: 'uuid' })
  therapeuticPlanId!: string;

  @ManyToOne(() => AnamnesisTherapeuticPlanEntity, (plan) => plan.acceptances, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'therapeutic_plan_id' })
  plan!: AnamnesisTherapeuticPlanEntity;

  @Column({ name: 'professional_id', type: 'uuid' })
  professionalId!: string;

  @Column({ name: 'accepted', type: 'boolean', default: true })
  accepted!: boolean;

  @Column({ name: 'terms_version', type: 'varchar', length: 32 })
  termsVersion!: string;

  @Column({ name: 'terms_text_snapshot', type: 'text' })
  termsTextSnapshot!: string;

  @Column({ name: 'accepted_at', type: 'timestamp with time zone' })
  acceptedAt!: Date;

  @Column({ name: 'accepted_ip', type: 'inet', nullable: true })
  acceptedIp?: string | null;

  @Column({ name: 'accepted_user_agent', type: 'text', nullable: true })
  acceptedUserAgent?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
