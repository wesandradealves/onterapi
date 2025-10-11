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
  ClinicInvitationChannel,
  ClinicInvitationEconomicSummary,
  ClinicInvitationStatus,
} from '../../../domain/clinic/types/clinic.types';
import { ClinicEntity } from './clinic.entity';

@Entity('clinic_invitations')
@Index(['clinicId', 'status'])
@Index(['tenantId', 'status'])
@Index(['clinicId', 'expiresAt'])
@Index(['tokenHash'], { unique: true })
export class ClinicInvitationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'clinic_id', type: 'uuid' })
  clinicId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'professional_id', type: 'uuid', nullable: true })
  professionalId?: string | null;

  @Column({ name: 'target_email', type: 'varchar', length: 320, nullable: true })
  targetEmail?: string | null;

  @Column({ name: 'issued_by', type: 'uuid' })
  issuedBy!: string;

  @Column({ name: 'status', type: 'varchar', length: 30 })
  status!: ClinicInvitationStatus;

  @Column({ name: 'token_hash', type: 'varchar', length: 128 })
  tokenHash!: string;

  @Column({ name: 'channel', type: 'varchar', length: 20 })
  channel!: ClinicInvitationChannel;

  @Column({ name: 'expires_at', type: 'timestamp with time zone' })
  expiresAt!: Date;

  @Column({ name: 'accepted_at', type: 'timestamp with time zone', nullable: true })
  acceptedAt?: Date | null;

  @Column({ name: 'accepted_by', type: 'uuid', nullable: true })
  acceptedBy?: string | null;

  @Column({ name: 'declined_at', type: 'timestamp with time zone', nullable: true })
  declinedAt?: Date | null;

  @Column({ name: 'declined_by', type: 'uuid', nullable: true })
  declinedBy?: string | null;

  @Column({ name: 'revoked_at', type: 'timestamp with time zone', nullable: true })
  revokedAt?: Date | null;

  @Column({ name: 'revoked_by', type: 'uuid', nullable: true })
  revokedBy?: string | null;

  @Column({ name: 'revocation_reason', type: 'text', nullable: true })
  revocationReason?: string | null;

  @Column({ name: 'economic_summary', type: 'jsonb' })
  economicSummary!: ClinicInvitationEconomicSummary;

  @Column({ name: 'metadata', type: 'jsonb', default: () => "'{}'" })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @ManyToOne(() => ClinicEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinic_id' })
  clinic?: ClinicEntity;
}
