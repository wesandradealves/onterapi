import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import {
  ClinicPaymentPayoutRequest,
  ClinicPaymentPayoutStatus,
} from '../../../domain/clinic/types/clinic.types';

@Entity('clinic_payment_payout_requests')
@Index(['clinicId', 'tenantId', 'paymentTransactionId'], { unique: false })
@Index(['tenantId', 'clinicId', 'fingerprint'], { unique: true, where: 'fingerprint IS NOT NULL' })
export class ClinicPaymentPayoutRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'appointment_id', type: 'uuid' })
  appointmentId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'clinic_id', type: 'uuid' })
  clinicId!: string;

  @Column({ name: 'professional_id', type: 'uuid' })
  professionalId!: string;

  @Column({ name: 'patient_id', type: 'uuid' })
  patientId!: string;

  @Column({ name: 'hold_id', type: 'uuid' })
  holdId!: string;

  @Column({ name: 'service_type_id', type: 'uuid' })
  serviceTypeId!: string;

  @Column({ name: 'payment_transaction_id', type: 'varchar', length: 128 })
  paymentTransactionId!: string;

  @Column({ name: 'provider', type: 'varchar', length: 64 })
  provider!: string;

  @Column({ name: 'credentials_id', type: 'varchar', length: 128 })
  credentialsId!: string;

  @Column({ name: 'sandbox_mode', type: 'boolean', default: false })
  sandboxMode!: boolean;

  @Column({ name: 'bank_account_id', type: 'varchar', length: 128, nullable: true })
  bankAccountId?: string | null;

  @Column({ name: 'base_amount_cents', type: 'integer' })
  baseAmountCents!: number;

  @Column({ name: 'net_amount_cents', type: 'integer', nullable: true })
  netAmountCents?: number | null;

  @Column({ name: 'remainder_cents', type: 'integer', default: 0 })
  remainderCents!: number;

  @Column({ name: 'split', type: 'jsonb' })
  split!: ClinicPaymentPayoutRequest['split'];

  @Column({ name: 'currency', type: 'varchar', length: 3 })
  currency!: string;

  @Column({ name: 'gateway_status', type: 'varchar', length: 64 })
  gatewayStatus!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 128, nullable: true })
  eventType?: string | null;

  @Column({ name: 'fingerprint', type: 'varchar', length: 128, nullable: true })
  fingerprint?: string | null;

  @Column({ name: 'payload_id', type: 'varchar', length: 128, nullable: true })
  payloadId?: string | null;

  @Column({ name: 'sandbox', type: 'boolean', default: false })
  sandbox!: boolean;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'pending' })
  status!: ClinicPaymentPayoutStatus;

  @Column({ name: 'attempts', type: 'integer', default: 0 })
  attempts!: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError?: string | null;

  @Column({ name: 'requested_at', type: 'timestamp with time zone' })
  requestedAt!: Date;

  @Column({ name: 'last_attempted_at', type: 'timestamp with time zone', nullable: true })
  lastAttemptedAt?: Date | null;

  @Column({ name: 'processed_at', type: 'timestamp with time zone', nullable: true })
  processedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
