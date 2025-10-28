import {
  Booking,
  BookingHold,
  ClinicInvitationPolicy,
  ExternalCalendarEvent,
  RecurrenceOccurrence,
  RecurrenceSeries,
} from '../../domain/scheduling/types/scheduling.types';
import { BookingEntity } from '../../infrastructure/scheduling/entities/booking.entity';
import { BookingHoldEntity } from '../../infrastructure/scheduling/entities/booking-hold.entity';
import { ClinicInvitationPolicyEntity } from '../../infrastructure/scheduling/entities/clinic-invitation-policy.entity';
import { RecurrenceSeriesEntity } from '../../infrastructure/scheduling/entities/recurrence-series.entity';
import { RecurrenceOccurrenceEntity } from '../../infrastructure/scheduling/entities/recurrence-occurrence.entity';
import { ExternalCalendarEventEntity } from '../../infrastructure/scheduling/entities/external-calendar-event.entity';

export const mapBookingEntityToDomain = (entity: BookingEntity): Booking => ({
  id: entity.id,
  tenantId: entity.tenantId,
  professionalId: entity.professionalId,
  originalProfessionalId: entity.originalProfessionalId ?? null,
  coverageId: entity.coverageId ?? null,
  clinicId: entity.clinicId,
  patientId: entity.patientId,
  source: entity.source,
  status: entity.status,
  paymentStatus: entity.paymentStatus,
  holdId: entity.holdId ?? null,
  holdExpiresAtUtc: entity.holdExpiresAtUtc ?? null,
  startAtUtc: entity.startAtUtc,
  endAtUtc: entity.endAtUtc,
  timezone: entity.timezone,
  lateToleranceMinutes: entity.lateToleranceMinutes,
  recurrenceSeriesId: entity.recurrenceSeriesId ?? null,
  cancellationReason: entity.cancellationReason ?? null,
  pricingSplit: entity.pricingSplit ?? null,
  preconditionsPassed: entity.preconditionsPassed,
  anamneseRequired: entity.anamneseRequired,
  anamneseOverrideReason: entity.anamneseOverrideReason ?? null,
  noShowMarkedAtUtc: entity.noShowMarkedAtUtc ?? null,
  createdAt: entity.createdAt,
  updatedAt: entity.updatedAt,
  version: entity.version,
});

export const mapBookingHoldEntityToDomain = (entity: BookingHoldEntity): BookingHold => ({
  id: entity.id,
  tenantId: entity.tenantId,
  originalProfessionalId: entity.originalProfessionalId ?? null,
  professionalId: entity.professionalId,
  coverageId: entity.coverageId ?? null,
  clinicId: entity.clinicId,
  patientId: entity.patientId,
  serviceTypeId: entity.serviceTypeId ?? null,
  startAtUtc: entity.startAtUtc,
  endAtUtc: entity.endAtUtc,
  ttlExpiresAtUtc: entity.ttlExpiresAtUtc,
  status: entity.status,
  createdAt: entity.createdAt,
  updatedAt: entity.updatedAt,
  version: entity.version,
});

export const mapClinicInvitationPolicyEntityToDomain = (
  entity: ClinicInvitationPolicyEntity,
): ClinicInvitationPolicy => ({
  id: entity.id,
  tenantId: entity.tenantId,
  clinicId: entity.clinicId,
  professionalId: entity.professionalId,
  pricingMode: entity.pricingMode,
  repasseMode: entity.repasseMode,
  channel: entity.channel,
  roundingPolicy: entity.roundingPolicy as 'half_even',
  validFrom: entity.validFrom,
  validTo: entity.validTo ?? null,
  priority: entity.priority,
  taxSchemaRef: entity.taxSchemaRef ?? null,
  createdAt: entity.createdAt,
  updatedAt: entity.updatedAt,
});

export const mapRecurrenceSeriesEntityToDomain = (
  entity: RecurrenceSeriesEntity,
): RecurrenceSeries => ({
  id: entity.id,
  tenantId: entity.tenantId,
  professionalId: entity.professionalId,
  clinicId: entity.clinicId,
  pattern: entity.pattern,
  patternValue: entity.patternValue,
  startDateUtc: entity.startDateUtc,
  endDateUtc: entity.endDateUtc ?? null,
  skipHolidays: entity.skipHolidays,
  holidayPolicy: entity.holidayPolicy,
  limits: {
    maxReschedulesPerOccurrence: entity.maxReschedulesPerOccurrence,
    maxReschedulesPerSeries: entity.maxReschedulesPerSeries,
  },
  createdAt: entity.createdAt,
  updatedAt: entity.updatedAt,
});

export const mapRecurrenceOccurrenceEntityToDomain = (
  entity: RecurrenceOccurrenceEntity,
): RecurrenceOccurrence => ({
  id: entity.id,
  tenantId: entity.tenantId,
  seriesId: entity.seriesId,
  bookingId: entity.bookingId,
  startAtUtc: entity.startAtUtc,
  endAtUtc: entity.endAtUtc,
  reschedulesCount: entity.reschedulesCount,
  createdAt: entity.createdAt,
  updatedAt: entity.updatedAt,
});

export const mapExternalCalendarEventEntityToDomain = (
  entity: ExternalCalendarEventEntity,
): ExternalCalendarEvent => ({
  id: entity.id,
  tenantId: entity.tenantId,
  professionalId: entity.professionalId,
  source: entity.source as 'google_calendar',
  externalId: entity.externalId,
  startAtUtc: entity.startAtUtc,
  endAtUtc: entity.endAtUtc,
  timezone: entity.timezone,
  status: entity.status,
  validationErrors: (entity.validationErrors as string[] | null) ?? null,
  resourceId: entity.resourceId ?? null,
  createdAt: entity.createdAt,
  updatedAt: entity.updatedAt,
});
