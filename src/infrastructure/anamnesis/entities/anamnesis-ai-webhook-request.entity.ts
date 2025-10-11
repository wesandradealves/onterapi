import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('anamnesis_ai_webhook_requests')
@Index(['analysisId'], { unique: true, where: '"analysis_id" IS NOT NULL' })
export class AnamnesisAIWebhookRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId?: string | null;

  @Column({ name: 'analysis_id', type: 'uuid', nullable: true })
  analysisId?: string | null;

  @Column({ name: 'signature_hash', type: 'varchar', length: 128, unique: true })
  signatureHash!: string;

  @Column({ name: 'payload_timestamp', type: 'timestamp with time zone' })
  payloadTimestamp!: Date;

  @Column({ name: 'received_at', type: 'timestamp with time zone' })
  receivedAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
