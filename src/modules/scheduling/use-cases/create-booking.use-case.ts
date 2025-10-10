import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '@shared/use-cases/base.use-case';
import {
  CreateBookingUseCaseInput,
  ICreateBookingUseCase,
} from '@domain/scheduling/interfaces/use-cases/create-booking.use-case.interface';
import {
  IBookingRepository,
  IBookingRepositoryToken,
} from '@domain/scheduling/interfaces/repositories/booking.repository.interface';
import {
  IBookingHoldRepository,
  IBookingHoldRepositoryToken,
} from '@domain/scheduling/interfaces/repositories/booking-hold.repository.interface';
import { Booking, NewBooking } from '@domain/scheduling/types/scheduling.types';
import { BookingValidationService } from '@domain/scheduling/services/booking-validation.service';
import { SchedulingErrorFactory } from '@shared/factories/scheduling-error.factory';
import { isFailure } from '@shared/types/result.type';
import { MessageBus } from '@shared/messaging/message-bus';
import { DomainEvents } from '@shared/events/domain-events';

@Injectable()
export class CreateBookingUseCase
  extends BaseUseCase<CreateBookingUseCaseInput, Booking>
  implements ICreateBookingUseCase
{
  protected readonly logger = new Logger(CreateBookingUseCase.name);

  constructor(
    @Inject(IBookingRepositoryToken)
    private readonly bookingRepository: IBookingRepository,
    @Inject(IBookingHoldRepositoryToken)
    private readonly holdRepository: IBookingHoldRepository,
    private readonly messageBus: MessageBus,
  ) {
    super();
  }

  protected async handle(input: CreateBookingUseCaseInput): Promise<Booking> {
    const {
      tenantId,
      holdId,
      source,
      timezone,
      paymentStatus,
      lateToleranceMinutes,
      recurrenceSeriesId,
      pricingSplit,
      preconditionsPassed,
      anamneseRequired,
      anamneseOverrideReason,
      requestedAtUtc,
    } = input;

    const nowUtc = requestedAtUtc ?? new Date();

    const hold = await this.holdRepository.findById(tenantId, holdId);

    if (!hold) {
      throw SchedulingErrorFactory.holdNotFound('Hold nao encontrado para criacao de agendamento');
    }

    const holdValidation = BookingValidationService.validateHoldForBookingCreation({
      hold,
      nowUtc,
    });

    if (isFailure(holdValidation)) {
      throw holdValidation.error;
    }

    const existingBooking = await this.bookingRepository.findByHold(tenantId, holdId);

    if (existingBooking) {
      throw SchedulingErrorFactory.bookingInvalidState(
        'Hold ja foi utilizado para criar um agendamento',
      );
    }

    await this.holdRepository.updateStatus({
      tenantId,
      holdId: hold.id,
      expectedVersion: hold.version,
      status: 'confirmed',
    });

    const bookingData: NewBooking = {
      tenantId,
      clinicId: hold.clinicId,
      professionalId: hold.professionalId,
      patientId: hold.patientId,
      source,
      status: 'scheduled',
      paymentStatus: paymentStatus ?? 'pending',
      holdId: hold.id,
      holdExpiresAtUtc: hold.ttlExpiresAtUtc,
      startAtUtc: hold.startAtUtc,
      endAtUtc: hold.endAtUtc,
      timezone,
      lateToleranceMinutes: lateToleranceMinutes ?? 15,
      recurrenceSeriesId: recurrenceSeriesId ?? null,
      cancellationReason: null,
      pricingSplit: pricingSplit ?? null,
      preconditionsPassed: preconditionsPassed ?? false,
      anamneseRequired: anamneseRequired ?? false,
      anamneseOverrideReason: anamneseOverrideReason ?? null,
      noShowMarkedAtUtc: null,
    };

    const booking = await this.bookingRepository.create(bookingData);

    await this.messageBus.publish(
      DomainEvents.schedulingBookingCreated(booking.id, {
        tenantId,
        clinicId: booking.clinicId,
        professionalId: booking.professionalId,
        patientId: booking.patientId,
        startAtUtc: booking.startAtUtc,
        endAtUtc: booking.endAtUtc,
        source: booking.source,
        timezone: booking.timezone,
      }),
    );

    return booking;
  }
}
