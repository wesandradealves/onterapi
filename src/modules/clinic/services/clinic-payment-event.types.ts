import { DomainEvent } from '../../../shared/events/domain-event.interface';

export interface ClinicPaymentAmountSnapshot {
  value?: number | null;
  netValue?: number | null;
}

export interface ClinicPaymentStatusChangedPayload {
  appointmentId: string;
  tenantId: string;
  clinicId: string;
  professionalId: string;
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

export type ClinicPaymentStatusChangedEvent = DomainEvent<ClinicPaymentStatusChangedPayload>;
export type ClinicPaymentSettledEvent = DomainEvent<ClinicPaymentSettledPayload>;
export type ClinicPaymentRefundedEvent = DomainEvent<ClinicPaymentRefundedPayload>;
export type ClinicPaymentChargebackEvent = DomainEvent<ClinicPaymentChargebackPayload>;
