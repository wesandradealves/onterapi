import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import {
  InvitationChannel,
  PricingMode,
  RepasseMode,
} from '../../../domain/scheduling/types/scheduling.types';

@Entity('scheduling_clinic_invitation_policies')
@Index(['tenantId', 'clinicId', 'professionalId', 'channel'], { unique: false })
export class ClinicInvitationPolicyEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'clinic_id', type: 'uuid' })
  clinicId!: string;

  @Column({ name: 'professional_id', type: 'uuid' })
  professionalId!: string;

  @Column({ name: 'pricing_mode', type: 'varchar', length: 20 })
  pricingMode!: PricingMode;

  @Column({ name: 'repasse_mode', type: 'varchar', length: 20 })
  repasseMode!: RepasseMode;

  @Column({ name: 'channel', type: 'varchar', length: 20 })
  channel!: InvitationChannel;

  @Column({ name: 'rounding_policy', type: 'varchar', length: 20, default: 'half_even' })
  roundingPolicy!: string;

  @Column({ name: 'valid_from', type: 'timestamp with time zone' })
  validFrom!: Date;

  @Column({ name: 'valid_to', type: 'timestamp with time zone', nullable: true })
  validTo?: Date | null;

  @Column({ name: 'priority', type: 'integer', default: 0 })
  priority!: number;

  @Column({ name: 'tax_schema_ref', type: 'varchar', length: 64, nullable: true })
  taxSchemaRef?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
