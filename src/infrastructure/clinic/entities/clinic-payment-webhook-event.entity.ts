import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('clinic_payment_webhook_events')
@Index(['tenantId', 'clinicId', 'provider', 'fingerprint'], { unique: true })
export class ClinicPaymentWebhookEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'clinic_id', type: 'uuid' })
  clinicId!: string;

  @Column({ name: 'provider', type: 'varchar', length: 64 })
  provider!: string;

  @Column({ name: 'payment_transaction_id', type: 'varchar', length: 128 })
  paymentTransactionId!: string;

  @Column({ name: 'fingerprint', type: 'varchar', length: 128 })
  fingerprint!: string;

  @Column({ name: 'appointment_id', type: 'uuid', nullable: true })
  appointmentId?: string | null;

  @Column({ name: 'event_type', type: 'varchar', length: 128, nullable: true })
  eventType?: string | null;

  @Column({ name: 'gateway_status', type: 'varchar', length: 64, nullable: true })
  gatewayStatus?: string | null;

  @Column({ name: 'payload_id', type: 'varchar', length: 128, nullable: true })
  payloadId?: string | null;

  @Column({ name: 'sandbox', type: 'boolean', default: false })
  sandbox!: boolean;

  @Column({ name: 'received_at', type: 'timestamptz' })
  receivedAt!: Date;

  @Column({ name: 'processed_at', type: 'timestamptz' })
  processedAt!: Date;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
