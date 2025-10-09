import { Booking, PricingSplit } from '../../../../domain/scheduling/types/scheduling.types';
import { BookingResponseDto } from '../dtos/booking-response.dto';

const toIso = (value: Date | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  return value.toISOString();
};

const toPricingSplit = (split: PricingSplit | null | undefined) => {
  if (!split) {
    return null;
  }

  return {
    totalCents: split.totalCents,
    platformCents: split.platformCents,
    clinicCents: split.clinicCents,
    professionalCents: split.professionalCents,
    gatewayCents: split.gatewayCents,
    taxesCents: split.taxesCents,
    currency: split.currency,
  };
};

export class BookingPresenter {
  static toResponse(booking: Booking): BookingResponseDto {
    return {
      id: booking.id,
      clinicId: booking.clinicId,
      professionalId: booking.professionalId,
      patientId: booking.patientId,
      source: booking.source,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      holdId: booking.holdId,
      holdExpiresAtUtc: toIso(booking.holdExpiresAtUtc),
      startAtUtc: booking.startAtUtc.toISOString(),
      endAtUtc: booking.endAtUtc.toISOString(),
      timezone: booking.timezone,
      lateToleranceMinutes: booking.lateToleranceMinutes,
      recurrenceSeriesId: booking.recurrenceSeriesId,
      cancellationReason: booking.cancellationReason,
      pricingSplit: toPricingSplit(booking.pricingSplit),
      preconditionsPassed: booking.preconditionsPassed,
      anamneseRequired: booking.anamneseRequired,
      anamneseOverrideReason: booking.anamneseOverrideReason,
      noShowMarkedAtUtc: toIso(booking.noShowMarkedAtUtc),
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
      version: booking.version,
    };
  }
}
