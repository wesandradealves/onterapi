import { DomainEvent } from '../../../shared/events/domain-event.interface';
import {
  ClinicCurrency,
  ClinicPaymentPayoutSplitAllocation,
} from '../../../domain/clinic/types/clinic.types';

export interface ClinicPaymentAmountSnapshot {
  value?: number | null;
  netValue?: number | null;
}

export interface ClinicPaymentStatusChangedPayload {
  appointmentId: string;
  tenantId: string;
  clinicId: string;
  professionalId: string;
  originalProfessionalId?: string | null;
  coverageId?: string | null;
  patientId: string;
  holdId: string;
  serviceTypeId: string;
  paymentTransactionId: string;
  previousStatus: string;
  newStatus: string;
  gatewayStatus: string;
  eventType?: string;
  sandbox: boolean;
  fingerprint?: string;
  payloadId?: string;
  amount?: ClinicPaymentAmountSnapshot;
  receivedAt: Date;
  paidAt?: Date;
  processedAt: Date;
}

export interface ClinicPaymentSettledPayload {
  appointmentId: string;
  tenantId: string;
  clinicId: string;
  professionalId: string;
  originalProfessionalId?: string | null;
  coverageId?: string | null;
  patientId: string;
  holdId: string;
  serviceTypeId: string;
  paymentTransactionId: string;
  gatewayStatus: string;
  eventType?: string;
  sandbox: boolean;
  fingerprint?: string;
  payloadId?: string;
  amount?: ClinicPaymentAmountSnapshot;
  settledAt: Date;
  processedAt: Date;
}

export interface ClinicPaymentRefundedPayload {
  appointmentId: string;
  tenantId: string;
  clinicId: string;
  professionalId: string;
  originalProfessionalId?: string | null;
  coverageId?: string | null;
  patientId: string;
  holdId: string;
  serviceTypeId: string;
  paymentTransactionId: string;
  gatewayStatus: string;
  eventType?: string;
  sandbox: boolean;
  fingerprint?: string;
  payloadId?: string;
  amount?: ClinicPaymentAmountSnapshot;
  refundedAt: Date;
  processedAt: Date;
}

export interface ClinicPaymentChargebackPayload {
  appointmentId: string;
  tenantId: string;
  clinicId: string;
  professionalId: string;
  originalProfessionalId?: string | null;
  coverageId?: string | null;
  patientId: string;
  holdId: string;
  serviceTypeId: string;
  paymentTransactionId: string;
  gatewayStatus: string;
  eventType?: string;
  sandbox: boolean;
  fingerprint?: string;
  payloadId?: string;
  amount?: ClinicPaymentAmountSnapshot;
  chargebackAt: Date;
  processedAt: Date;
}

export interface ClinicPaymentFailedPayload {
  appointmentId: string;
  tenantId: string;
  clinicId: string;
  professionalId: string;
  originalProfessionalId?: string | null;
  coverageId?: string | null;
  patientId: string;
  holdId: string;
  serviceTypeId: string;
  paymentTransactionId: string;
  gatewayStatus: string;
  eventType?: string;
  sandbox: boolean;
  fingerprint?: string;
  payloadId?: string;
  amount?: ClinicPaymentAmountSnapshot;
  failedAt: Date;
  processedAt: Date;
  reason?: string | null;
}

export interface ClinicPaymentPayoutRequestedPayload {
  appointmentId: string;
  tenantId: string;
  clinicId: string;
  professionalId: string;
  originalProfessionalId?: string | null;
  coverageId?: string | null;
  patientId: string;
  holdId: string;
  serviceTypeId: string;
  paymentTransactionId: string;
  provider: string;
  credentialsId: string;
  sandboxMode: boolean;
  bankAccountId?: string | null;
  settledAt: Date;
  baseAmountCents: number;
  netAmountCents?: number | null;
  remainderCents: number;
  split: ClinicPaymentPayoutSplitAllocation[];
  currency: ClinicCurrency;
  gatewayStatus: string;
  eventType?: string | null;
  fingerprint?: string | null;
  payloadId?: string | null;
  sandbox: boolean;
  requestedAt: Date;
}

export type ClinicPaymentStatusChangedEvent = DomainEvent<ClinicPaymentStatusChangedPayload>;
export type ClinicPaymentSettledEvent = DomainEvent<ClinicPaymentSettledPayload>;
export type ClinicPaymentRefundedEvent = DomainEvent<ClinicPaymentRefundedPayload>;
export type ClinicPaymentChargebackEvent = DomainEvent<ClinicPaymentChargebackPayload>;
export type ClinicPaymentFailedEvent = DomainEvent<ClinicPaymentFailedPayload>;
export type ClinicPaymentPayoutRequestedEvent = DomainEvent<ClinicPaymentPayoutRequestedPayload>;
