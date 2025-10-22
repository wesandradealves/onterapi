import { BookingHold } from '../../../../domain/scheduling/types/scheduling.types';
import { BookingHoldResponseDto } from '../dtos/booking-hold-response.dto';

export class BookingHoldPresenter {
  static toResponse(hold: BookingHold): BookingHoldResponseDto {
    return {
      id: hold.id,
      clinicId: hold.clinicId,
      professionalId: hold.professionalId,
      patientId: hold.patientId,
      serviceTypeId: hold.serviceTypeId,
      status: hold.status,
      startAtUtc: hold.startAtUtc.toISOString(),
      endAtUtc: hold.endAtUtc.toISOString(),
      ttlExpiresAtUtc: hold.ttlExpiresAtUtc.toISOString(),
      createdAt: hold.createdAt.toISOString(),
      updatedAt: hold.updatedAt.toISOString(),
      version: hold.version,
    };
  }
}
