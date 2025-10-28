export type PricingMode = 'fixed' | 'percentage' | 'tiered';

export type RepasseMode = 'fixed' | 'percentage';

export type InvitationChannel = 'marketplace' | 'direct';

export type BookingStatus =
  | 'scheduled'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type PaymentStatus =
  | 'not_applied'
  | 'pending'
  | 'approved'
  | 'settled'
  | 'refunded'
  | 'disputed';

export type HoldStatus = 'active' | 'expired' | 'confirmed' | 'cancelled';

export type BookingSource =
  | 'marketplace'
  | 'clinic_portal'
  | 'professional_portal'
  | 'patient_portal'
  | 'api';

export type CancellationReason =
  | 'patient_request'
  | 'clinic_request'
  | 'professional_request'
  | 'medical_exception'
  | 'system'
  | 'payment_failure'
  | 'chargeback';

export interface PricingSplit {
  totalCents: number;
  platformCents: number;
  clinicCents: number;
  professionalCents: number;
  gatewayCents: number;
  taxesCents: number;
  currency: string;
}

export interface ClinicInvitationPolicy {
  id: string;
  tenantId: string;
  clinicId: string;
  professionalId: string;
  pricingMode: PricingMode;
  repasseMode: RepasseMode;
  channel: InvitationChannel;
  roundingPolicy: 'half_even';
  validFrom: Date;
  validTo: Date | null;
  priority: number;
  taxSchemaRef: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingHold {
  id: string;
  tenantId: string;
  professionalId: string;
  originalProfessionalId?: string | null;
  coverageId?: string | null;
  clinicId: string;
  patientId: string;
  serviceTypeId: string | null;
  startAtUtc: Date;
  endAtUtc: Date;
  ttlExpiresAtUtc: Date;
  status: HoldStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Booking {
  id: string;
  tenantId: string;
  professionalId: string;
  clinicId: string;
  patientId: string;
  source: BookingSource;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  holdId: string | null;
  holdExpiresAtUtc: Date | null;
  startAtUtc: Date;
  endAtUtc: Date;
  originalProfessionalId?: string | null;
  coverageId?: string | null;
  timezone: string;
  lateToleranceMinutes: number;
  recurrenceSeriesId: string | null;
  cancellationReason: CancellationReason | null;
  pricingSplit: PricingSplit | null;
  preconditionsPassed: boolean;
  anamneseRequired: boolean;
  anamneseOverrideReason: string | null;
  noShowMarkedAtUtc: Date | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface RecurrenceLimits {
  maxReschedulesPerOccurrence: number;
  maxReschedulesPerSeries: number;
  reschedulesUsed?: number;
}

export interface CancellationPolicy {
  fullRefundThresholdHours: number;
  partialRefundThresholdHours: number;
  partialRefundPercentage: number;
  noRefundThresholdHours: number;
}

export interface AvailabilityOptions {
  minAdvanceMinutes: number;
  maxAdvanceDays: number;
  bufferBetweenBookingsMinutes: number;
}

export type HolidayPolicy = 'skip' | 'push';

export type RecurrencePatternType = 'weekly' | 'biweekly' | 'monthly_date' | 'monthly_weekday';

export interface RecurrenceSeries {
  id: string;
  tenantId: string;
  professionalId: string;
  clinicId: string;
  pattern: RecurrencePatternType;
  patternValue: string;
  startDateUtc: Date;
  endDateUtc: Date | null;
  skipHolidays: boolean;
  holidayPolicy: HolidayPolicy;
  limits: RecurrenceLimits;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecurrenceOccurrence {
  id: string;
  tenantId: string;
  seriesId: string;
  bookingId: string;
  startAtUtc: Date;
  endAtUtc: Date;
  reschedulesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ExternalCalendarEventStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface ExternalCalendarEvent {
  id: string;
  tenantId: string;
  professionalId: string;
  source: 'google_calendar';
  externalId: string;
  startAtUtc: Date;
  endAtUtc: Date;
  timezone: string;
  status: ExternalCalendarEventStatus;
  validationErrors: string[] | null;
  resourceId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type NewBooking = Omit<Booking, 'id' | 'createdAt' | 'updatedAt' | 'version'>;

export interface UpdateBookingStatusInput {
  tenantId: string;
  bookingId: string;
  expectedVersion: number;
  status: BookingStatus;
  paymentStatus?: PaymentStatus;
  cancellationReason?: CancellationReason | null;
}

export interface CreateHoldInput {
  tenantId: string;
  professionalId: string;
  originalProfessionalId?: string | null;
  coverageId?: string | null;
  clinicId: string;
  patientId: string;
  serviceTypeId: string;
  startAtUtc: Date;
  endAtUtc: Date;
  ttlExpiresAtUtc: Date;
}

export interface UpdateHoldStatusInput {
  tenantId: string;
  holdId: string;
  expectedVersion: number;
  status: HoldStatus;
}

export interface RecordPaymentStatusInput {
  tenantId: string;
  bookingId: string;
  expectedVersion: number;
  paymentStatus: PaymentStatus;
}

export interface RescheduleBookingInput {
  tenantId: string;
  bookingId: string;
  expectedVersion: number;
  newStartAtUtc: Date;
  newEndAtUtc: Date;
  reason: string;
}

export interface MarkNoShowInput {
  tenantId: string;
  bookingId: string;
  expectedVersion: number;
  markedAtUtc: Date;
}
