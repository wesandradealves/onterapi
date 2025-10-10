import { DomainEvent } from '@shared/events/domain-event.interface';

export interface SchedulingHoldCreatedPayload {
  holdId: string;
  tenantId: string;
  clinicId: string;
  professionalId: string;
  patientId: string;
  startAtUtc: Date;
  endAtUtc: Date;
  ttlExpiresAtUtc: Date;
  createdAt: Date;
}

export interface SchedulingBookingCreatedPayload {
  bookingId: string;
  tenantId: string;
  clinicId: string;
  professionalId: string;
  patientId: string;
  startAtUtc: Date;
  endAtUtc: Date;
  source: string;
  timezone: string;
  createdAt: Date;
}

export interface SchedulingBookingConfirmedPayload {
  bookingId: string;
  tenantId: string;
  clinicId: string;
  professionalId: string;
  patientId: string;
  startAtUtc: Date;
  endAtUtc: Date;
  source: string;
  confirmedAt: Date;
}

export interface SchedulingBookingRescheduledPayload {
  bookingId: string;
  tenantId: string;
  clinicId: string;
  professionalId: string;
  patientId: string;
  previousStartAtUtc: Date;
  previousEndAtUtc: Date;
  newStartAtUtc: Date;
  newEndAtUtc: Date;
  rescheduledAt: Date;
}

export interface SchedulingBookingCancelledPayload {
  bookingId: string;
  tenantId: string;
  clinicId: string;
  professionalId: string;
  patientId: string;
  cancelledBy: string;
  reason?: string;
  cancelledAt: Date;
}

export interface SchedulingBookingNoShowPayload {
  bookingId: string;
  tenantId: string;
  clinicId: string;
  professionalId: string;
  patientId: string;
  markedAt: Date;
}

export interface SchedulingPaymentStatusChangedPayload {
  bookingId: string;
  tenantId: string;
  clinicId: string;
  professionalId: string;
  patientId: string;
  previousStatus: string;
  newStatus: string;
  changedAt: Date;
}

export type SchedulingHoldCreatedEvent = DomainEvent<SchedulingHoldCreatedPayload>;
export type SchedulingBookingCreatedEvent = DomainEvent<SchedulingBookingCreatedPayload>;
export type SchedulingBookingConfirmedEvent = DomainEvent<SchedulingBookingConfirmedPayload>;
export type SchedulingBookingRescheduledEvent = DomainEvent<SchedulingBookingRescheduledPayload>;
export type SchedulingBookingCancelledEvent = DomainEvent<SchedulingBookingCancelledPayload>;
export type SchedulingBookingNoShowEvent = DomainEvent<SchedulingBookingNoShowPayload>;
export type SchedulingPaymentStatusChangedEvent =
  DomainEvent<SchedulingPaymentStatusChangedPayload>;
