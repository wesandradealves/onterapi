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

import {
  ClinicInvitationChannelScope,
  ClinicInvitationEconomicSummary,
} from '../../../domain/clinic/types/clinic.types';
import { ClinicEntity } from './clinic.entity';

@Entity('clinic_professional_policies')
@Index(['clinicId', 'professionalId', 'tenantId'])
@Index(['clinicId', 'professionalId', 'tenantId'], {
  unique: true,
  where: '"ended_at" IS NULL',
})
export class ClinicProfessionalPolicyEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'clinic_id', type: 'uuid' })
  clinicId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'professional_id', type: 'uuid' })
  professionalId!: string;

  @Column({ name: 'channel_scope', type: 'varchar', length: 20 })
  channelScope!: ClinicInvitationChannelScope;

  @Column({ name: 'economic_summary', type: 'jsonb' })
  economicSummary!: ClinicInvitationEconomicSummary;

  @Column({ name: 'effective_at', type: 'timestamp with time zone' })
  effectiveAt!: Date;

  @Column({ name: 'ended_at', type: 'timestamp with time zone', nullable: true })
  endedAt?: Date | null;

  @Column({ name: 'source_invitation_id', type: 'uuid' })
  sourceInvitationId!: string;

  @Column({ name: 'accepted_by', type: 'uuid' })
  acceptedBy!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @ManyToOne(() => ClinicEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinic_id' })
  clinic?: ClinicEntity;
}
