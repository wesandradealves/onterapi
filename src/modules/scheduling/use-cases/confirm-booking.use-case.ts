import { Inject, Injectable, Logger } from "@nestjs/common";

import { BaseUseCase } from "@shared/use-cases/base.use-case";
import { Booking } from "@domain/scheduling/types/scheduling.types";
import { BookingValidationService } from "@domain/scheduling/services/booking-validation.service";
import {
  IBookingRepository,
  IBookingRepositoryToken,
} from "@domain/scheduling/interfaces/repositories/booking.repository.interface";
import {
  IBookingHoldRepository,
  IBookingHoldRepositoryToken,
} from "@domain/scheduling/interfaces/repositories/booking-hold.repository.interface";
import {
  IConfirmBookingUseCase,
  ConfirmBookingUseCaseInput,
} from "@domain/scheduling/interfaces/use-cases/confirm-booking.use-case.interface";
import { SchedulingErrorFactory } from "@shared/factories/scheduling-error.factory";
import { MessageBus } from "@shared/messaging/message-bus";
import { DomainEvents } from "@shared/events/domain-events";
import { isFailure } from "@shared/types/result.type";

@Injectable()
export class ConfirmBookingUseCase
  extends BaseUseCase<ConfirmBookingUseCaseInput, Booking>
  implements IConfirmBookingUseCase
{
  protected readonly logger = new Logger(ConfirmBookingUseCase.name);

  constructor(
    @Inject(IBookingRepositoryToken)
    private readonly bookingRepository: IBookingRepository,
    @Inject(IBookingHoldRepositoryToken)
    private readonly holdRepository: IBookingHoldRepository,
    private readonly messageBus: MessageBus,
  ) {
    super();
  }

  protected async handle(input: ConfirmBookingUseCaseInput): Promise<Booking> {
    const { tenantId, bookingId, holdId, paymentStatus, confirmationAtUtc } = input;

    const booking = await this.bookingRepository.findById(tenantId, bookingId);

    if (!booking) {
      throw SchedulingErrorFactory.bookingNotFound('Agendamento nao encontrado');
    }

    const hold = await this.holdRepository.findById(tenantId, holdId);

    if (!hold) {
      throw SchedulingErrorFactory.holdNotFound('Hold nao encontrado para confirmacao');
    }

    const nowUtc = confirmationAtUtc ?? new Date();

    const validation = BookingValidationService.validateHoldForConfirmation({
      hold,
      nowUtc,
    });

    if (isFailure(validation)) {
      throw validation.error;
    }

    const paymentValidation = BookingValidationService.validatePaymentForConfirmation({
      booking,
      paymentStatus,
    });

    if (isFailure(paymentValidation)) {
      throw paymentValidation.error;
    }

    const updatedBooking = await this.bookingRepository.updateStatus({
      tenantId,
      bookingId,
      expectedVersion: booking.version,
      status: 'confirmed',
      paymentStatus,
    });

    await this.holdRepository.updateStatus({
      tenantId,
      holdId,
      expectedVersion: hold.version,
      status: 'confirmed',
    });

    await this.messageBus.publish(
      DomainEvents.schedulingBookingConfirmed(bookingId, {
        tenantId,
        professionalId: booking.professionalId,
        clinicId: booking.clinicId,
        patientId: booking.patientId,
        startAtUtc: updatedBooking.startAtUtc,
        endAtUtc: updatedBooking.endAtUtc,
        source: booking.source,
      }),
    );

    return updatedBooking;
  }
}
