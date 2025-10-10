import { Inject, Injectable, Logger } from "@nestjs/common";

import { BaseUseCase } from "@shared/use-cases/base.use-case";
import { isFailure } from "@shared/types/result.type";
import { SchedulingErrorFactory } from "@shared/factories/scheduling-error.factory";
import { BookingValidationService } from "@domain/scheduling/services/booking-validation.service";
import { Booking } from "@domain/scheduling/types/scheduling.types";
import {
  IBookingRepository,
  IBookingRepositoryToken,
} from "@domain/scheduling/interfaces/repositories/booking.repository.interface";
import {
  IMarkBookingNoShowUseCase,
  MarkBookingNoShowUseCaseInput,
} from "@domain/scheduling/interfaces/use-cases/mark-booking-no-show.use-case.interface";
import { MessageBus } from "@shared/messaging/message-bus";
import { DomainEvents } from "@shared/events/domain-events";

@Injectable()
export class MarkBookingNoShowUseCase
  extends BaseUseCase<MarkBookingNoShowUseCaseInput, Booking>
  implements IMarkBookingNoShowUseCase
{
  protected readonly logger = new Logger(MarkBookingNoShowUseCase.name);

  constructor(
    @Inject(IBookingRepositoryToken)
    private readonly bookingRepository: IBookingRepository,
    private readonly messageBus: MessageBus,
  ) {
    super();
  }

  protected async handle(input: MarkBookingNoShowUseCaseInput): Promise<Booking> {
    const { tenantId, bookingId, expectedVersion, markedAtUtc } = input;

    const booking = await this.bookingRepository.findById(tenantId, bookingId);

    if (!booking) {
      throw SchedulingErrorFactory.bookingNotFound('Agendamento nao encontrado');
    }

    if (booking.status === 'no_show' || booking.noShowMarkedAtUtc) {
      throw SchedulingErrorFactory.bookingInvalidState('Agendamento ja marcado como no-show');
    }

    const validation = BookingValidationService.validateNoShowMarking({
      booking,
      nowUtc: markedAtUtc,
    });

    if (isFailure(validation)) {
      throw validation.error;
    }

    const updatedBooking = await this.bookingRepository.markNoShow({
      tenantId,
      bookingId,
      expectedVersion,
      markedAtUtc,
    });

    await this.messageBus.publish(
      DomainEvents.schedulingBookingNoShow(bookingId, {
        tenantId,
        professionalId: booking.professionalId,
        clinicId: booking.clinicId,
        patientId: booking.patientId,
      }),
    );

    return updatedBooking;
  }
}
