import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
} from '@nestjs/common';

import { BookingValidationService } from '../../../src/domain/scheduling/services/booking-validation.service';
import {
  AvailabilityOptions,
  Booking,
  BookingHold,
  RecurrenceLimits,
} from '../../../src/domain/scheduling/types/scheduling.types';
import { isFailure, isSuccess } from '../../../src/shared/types/result.type';

const createBooking = (overrides: Partial<Booking>): Booking => ({
  id: 'booking-1',
  tenantId: 'tenant-1',
  professionalId: 'prof-1',
  clinicId: 'clinic-1',
  patientId: 'patient-1',
  source: 'clinic_portal',
  status: 'scheduled',
  paymentStatus: 'pending',
  holdId: 'hold-1',
  holdExpiresAtUtc: new Date('2025-10-08T10:00:00Z'),
  startAtUtc: new Date('2025-10-10T10:00:00Z'),
  endAtUtc: new Date('2025-10-10T11:00:00Z'),
  timezone: 'America/Sao_Paulo',
  lateToleranceMinutes: 15,
  recurrenceSeriesId: null,
  cancellationReason: null,
  pricingSplit: null,
  preconditionsPassed: true,
  anamneseRequired: false,
  anamneseOverrideReason: null,
  noShowMarkedAtUtc: null,
  createdAt: new Date('2025-10-01T10:00:00Z'),
  updatedAt: new Date('2025-10-01T10:00:00Z'),
  version: 1,
  ...overrides,
});

const createHold = (overrides: Partial<BookingHold> = {}): BookingHold => ({
  id: 'hold-1',
  tenantId: 'tenant-1',
  professionalId: 'prof-1',
  clinicId: 'clinic-1',
  patientId: 'patient-1',
  serviceTypeId: 'service-1',
  startAtUtc: new Date('2025-10-10T10:00:00Z'),
  endAtUtc: new Date('2025-10-10T11:00:00Z'),
  ttlExpiresAtUtc: new Date('2025-10-08T09:50:00Z'),
  status: 'active',
  version: 1,
  createdAt: new Date('2025-10-01T09:00:00Z'),
  updatedAt: new Date('2025-10-01T09:00:00Z'),
  ...overrides,
});

const defaultAvailability: AvailabilityOptions = {
  minAdvanceMinutes: 120,
  maxAdvanceDays: 90,
  bufferBetweenBookingsMinutes: 15,
};

describe('BookingValidationService', () => {
  describe('validatePaymentForConfirmation', () => {
    it('accepts confirmation when payment is approved and status is scheduled', () => {
      const booking = createBooking({ paymentStatus: 'approved' });
      const result = BookingValidationService.validatePaymentForConfirmation({
        booking,
        paymentStatus: 'approved',
      });

      expect(isSuccess(result)).toBe(true);
    });

    it('rejects confirmation when payment is not approved', () => {
      const booking = createBooking({});
      const result = BookingValidationService.validatePaymentForConfirmation({
        booking,
        paymentStatus: 'pending',
      });

      expect(isFailure(result)).toBe(true);
      expect(result).toEqual({
        error: expect.any(ForbiddenException),
      });
    });

    it('rejects confirmation when booking status is not scheduled', () => {
      const booking = createBooking({ status: 'in_progress', paymentStatus: 'approved' });
      const result = BookingValidationService.validatePaymentForConfirmation({
        booking,
        paymentStatus: 'approved',
      });

      expect(isFailure(result)).toBe(true);
    });
  });

  describe('validatePaymentForCompletion', () => {
    it('accepts completion when booking is in progress and payment settled', () => {
      const booking = createBooking({ status: 'in_progress', paymentStatus: 'settled' });

      const result = BookingValidationService.validatePaymentForCompletion(booking);

      expect(isSuccess(result)).toBe(true);
    });

    it('rejects completion when payment is pending', () => {
      const booking = createBooking({ status: 'in_progress', paymentStatus: 'pending' });
      const result = BookingValidationService.validatePaymentForCompletion(booking);

      expect(isFailure(result)).toBe(true);
    });
  });

  describe('validateAdvanceWindow', () => {
    it('rejects hold creation when start time is too close', () => {
      const startAtUtc = new Date('2025-10-08T10:30:00Z');
      const nowUtc = new Date('2025-10-08T09:30:00Z');

      const result = BookingValidationService.validateAdvanceWindow({
        startAtUtc,
        nowUtc,
        availability: defaultAvailability,
        context: 'hold_creation',
      });

      expect(isFailure(result)).toBe(true);
    });

    it('accepts when within configured window', () => {
      const startAtUtc = new Date('2025-10-12T12:00:00Z');
      const nowUtc = new Date('2025-10-08T12:00:00Z');

      const result = BookingValidationService.validateAdvanceWindow({
        startAtUtc,
        nowUtc,
        availability: defaultAvailability,
        context: 'hold_creation',
      });

      expect(isSuccess(result)).toBe(true);
    });
  });

  describe('validateHoldForConfirmation', () => {
    it('rejects confirmation when hold expired', () => {
      const hold = createHold({
        ttlExpiresAtUtc: new Date('2025-10-08T09:00:00Z'),
      });
      const nowUtc = new Date('2025-10-08T09:05:00Z');

      const result = BookingValidationService.validateHoldForConfirmation({ hold, nowUtc });

      expect(isFailure(result)).toBe(true);
      expect(result.error).toBeInstanceOf(GoneException);
    });

    it('accepts when hold is active and valid', () => {
      const hold = createHold({
        ttlExpiresAtUtc: new Date('2025-10-08T10:30:00Z'),
      });
      const nowUtc = new Date('2025-10-08T09:30:00Z');

      const result = BookingValidationService.validateHoldForConfirmation({ hold, nowUtc });

      expect(isSuccess(result)).toBe(true);
    });
  });

  describe('validateHoldForBookingCreation', () => {
    it('rejects creation when hold is inactive', () => {
      const hold = createHold({ status: 'cancelled' });
      const result = BookingValidationService.validateHoldForBookingCreation({
        hold,
        nowUtc: new Date('2025-10-08T09:30:00Z'),
      });

      expect(isFailure(result)).toBe(true);
      expect(result.error).toBeInstanceOf(ConflictException);
    });

    it('accepts creation when hold is active', () => {
      const hold = createHold();
      const result = BookingValidationService.validateHoldForBookingCreation({
        hold,
        nowUtc: new Date('2025-10-08T09:30:00Z'),
      });

      expect(isSuccess(result)).toBe(true);
    });
  });

  describe('computeHoldExpiry', () => {
    it('returns now when candidate expiry is in the past', () => {
      const startAtUtc = new Date(Date.now() + 30 * MS_IN_MINUTE);
      const availability: AvailabilityOptions = {
        ...defaultAvailability,
        minAdvanceMinutes: 60,
      };
      const nowUtc = new Date();

      const expiry = BookingValidationService.computeHoldExpiry(startAtUtc, availability, nowUtc);

      expect(expiry.getTime()).toBeGreaterThanOrEqual(nowUtc.getTime());
    });
  });

  describe('validateRescheduleLimits', () => {
    const limits: RecurrenceLimits = {
      maxReschedulesPerOccurrence: 1,
      maxReschedulesPerSeries: 3,
    };

    it('rejects when occurrence limit reached', () => {
      const result = BookingValidationService.validateRescheduleLimits({
        limits,
        occurrenceReschedules: 1,
        seriesReschedules: 0,
      });

      expect(isFailure(result)).toBe(true);
      expect(result.error).toBeInstanceOf(ConflictException);
    });

    it('rejects when series limit reached', () => {
      const result = BookingValidationService.validateRescheduleLimits({
        limits,
        occurrenceReschedules: 0,
        seriesReschedules: 3,
      });

      expect(isFailure(result)).toBe(true);
      expect(result.error).toBeInstanceOf(ConflictException);
    });

    it('accepts when under limits', () => {
      const result = BookingValidationService.validateRescheduleLimits({
        limits,
        occurrenceReschedules: 0,
        seriesReschedules: 2,
      });

      expect(isSuccess(result)).toBe(true);
    });
  });

  describe('validateNoShowMarking', () => {
    it('rejects when booking not confirmed', () => {
      const booking = createBooking({ status: 'scheduled' });

      const result = BookingValidationService.validateNoShowMarking({
        booking,
        nowUtc: new Date('2025-10-10T10:20:00Z'),
      });

      expect(isFailure(result)).toBe(true);
      expect(result.error).toBeInstanceOf(ConflictException);
    });

    it('rejects when still within tolerance', () => {
      const booking = createBooking({ status: 'confirmed' });
      const nowUtc = new Date(booking.startAtUtc.getTime() + 5 * MS_IN_MINUTE);

      const result = BookingValidationService.validateNoShowMarking({
        booking,
        nowUtc,
      });

      expect(isFailure(result)).toBe(true);
      expect(result.error).toBeInstanceOf(BadRequestException);
    });

    it('accepts when past tolerance', () => {
      const booking = createBooking({ status: 'confirmed' });
      const nowUtc = new Date(
        booking.startAtUtc.getTime() + (booking.lateToleranceMinutes + 5) * MS_IN_MINUTE,
      );

      const result = BookingValidationService.validateNoShowMarking({
        booking,
        nowUtc,
      });

      expect(isSuccess(result)).toBe(true);
    });
  });
});

const MS_IN_MINUTE = 60 * 1000;
