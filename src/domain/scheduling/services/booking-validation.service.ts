import {
  AvailabilityOptions,
  Booking,
  BookingHold,
  PaymentStatus,
  RecurrenceLimits,
} from '../types/scheduling.types';
import { Result, failure, success } from '../../../shared/types/result.type';
import { SchedulingErrorFactory } from '../../../shared/factories/scheduling-error.factory';

interface AdvanceValidationInput {
  startAtUtc: Date;
  nowUtc: Date;
  availability: AvailabilityOptions;
  context: 'hold_creation' | 'confirmation';
}

interface HoldConfirmationValidationInput {
  hold: BookingHold | null;
  nowUtc: Date;
}

interface PaymentValidationInput {
  booking: Booking;
  paymentStatus: PaymentStatus;
}

interface RescheduleValidationInput {
  limits: RecurrenceLimits;
  occurrenceReschedules: number;
  seriesReschedules: number;
}

interface NoShowValidationInput {
  booking: Booking;
  nowUtc: Date;
}

const MS_IN_MINUTE = 60 * 1000;

export class BookingValidationService {
  static validateAdvanceWindow(input: AdvanceValidationInput): Result<void> {
    const { startAtUtc, nowUtc, availability, context } = input;

    const minAdvanceMillis = availability.minAdvanceMinutes * MS_IN_MINUTE;
    const maxAdvanceMillis = availability.maxAdvanceDays * 24 * 60 * MS_IN_MINUTE;

    const diffMillis = startAtUtc.getTime() - nowUtc.getTime();

    if (diffMillis < minAdvanceMillis) {
      return failure(
        SchedulingErrorFactory.tooCloseToStart(
          `Agendamento nao respeita antecedencia minima para ${context}`,
        ),
      );
    }

    if (diffMillis > maxAdvanceMillis) {
      return failure(
        SchedulingErrorFactory.tooFarInFuture(
          'Agendamento ultrapassa antecedencia maxima permitida',
        ),
      );
    }

    return success(undefined);
  }

  static validateHoldForConfirmation(input: HoldConfirmationValidationInput): Result<void> {
    const { hold, nowUtc } = input;

    if (!hold) {
      return failure(
        SchedulingErrorFactory.holdNotFound(
          'Nao ha reserva ativa para confirmar o agendamento',
        ),
      );
    }

    if (hold.status !== 'active') {
      return failure(
        SchedulingErrorFactory.holdInvalidState('Hold nao esta mais ativo para confirmacao'),
      );
    }

    if (hold.ttlExpiresAtUtc.getTime() <= nowUtc.getTime()) {
      return failure(
        SchedulingErrorFactory.holdExpired('Hold expirou antes da confirmacao'),
      );
    }

    return success(undefined);
  }

  static validatePaymentForConfirmation(input: PaymentValidationInput): Result<void> {
    const { booking, paymentStatus } = input;

    if (paymentStatus !== 'approved') {
      return failure(
        SchedulingErrorFactory.paymentNotApproved(
          `Status de pagamento invalido para confirmar: ${paymentStatus}`,
        ),
      );
    }

    if (booking.status !== 'scheduled') {
      return failure(
        SchedulingErrorFactory.bookingInvalidState(
          `Estado atual (${booking.status}) nao permite confirmacao`,
        ),
      );
    }

    return success(undefined);
  }

  static validatePaymentForCompletion(booking: Booking): Result<void> {
    if (booking.status !== 'in_progress') {
      return failure(
        SchedulingErrorFactory.bookingInvalidState(
          `Estado atual (${booking.status}) nao permite conclusao`,
        ),
      );
    }

    if (booking.paymentStatus !== 'approved' && booking.paymentStatus !== 'settled') {
      return failure(
        SchedulingErrorFactory.paymentNotApproved(
          `Status de pagamento (${booking.paymentStatus}) nao permite conclusao`,
        ),
      );
    }

    return success(undefined);
  }

  static computeHoldExpiry(startAtUtc: Date, availability: AvailabilityOptions, nowUtc = new Date()): Date {
    const ttlMilliseconds = availability.minAdvanceMinutes * MS_IN_MINUTE;
    const candidate = new Date(startAtUtc.getTime() - ttlMilliseconds);

    if (candidate.getTime() <= nowUtc.getTime()) {
      return new Date(nowUtc.getTime());
    }

    return candidate;
  }

  static validateRescheduleLimits(input: RescheduleValidationInput): Result<void> {
    const { limits, occurrenceReschedules, seriesReschedules } = input;

    if (occurrenceReschedules >= limits.maxReschedulesPerOccurrence) {
      return failure(
        SchedulingErrorFactory.recurrenceLimitReached(
          'Limite de reagendamentos por ocorrencia atingido',
        ),
      );
    }

    if (seriesReschedules >= limits.maxReschedulesPerSeries) {
      return failure(
        SchedulingErrorFactory.recurrenceLimitReached(
          'Limite de reagendamentos na serie atingido',
        ),
      );
    }

    return success(undefined);
  }

  static validateNoShowMarking(input: NoShowValidationInput): Result<void> {
    const { booking, nowUtc } = input;

    if (booking.status !== 'confirmed') {
      return failure(
        SchedulingErrorFactory.bookingInvalidState(
          `Nao e possivel marcar no-show quando o status e ${booking.status}`,
        ),
      );
    }

    const toleranceMillis = booking.lateToleranceMinutes * MS_IN_MINUTE;
    const toleranceDeadline = new Date(booking.startAtUtc.getTime() + toleranceMillis);

    if (nowUtc.getTime() < toleranceDeadline.getTime()) {
      return failure(
        SchedulingErrorFactory.tooEarlyForNoShow(
          'Ainda dentro da tolerancia para considerar no-show',
        ),
      );
    }

    return success(undefined);
  }
}
