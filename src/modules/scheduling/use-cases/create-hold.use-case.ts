import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import { AvailabilityOptions, BookingHold } from '../../../domain/scheduling/types/scheduling.types';
import { BookingValidationService } from '../../../domain/scheduling/services/booking-validation.service';
import {
  IBookingRepository,
  IBookingRepositoryToken,
} from '../../../domain/scheduling/interfaces/repositories/booking.repository.interface';
import {
  IBookingHoldRepository,
  IBookingHoldRepositoryToken,
} from '../../../domain/scheduling/interfaces/repositories/booking-hold.repository.interface';
import {
  CreateHoldUseCaseInput,
  ICreateHoldUseCase,
} from '../../../domain/scheduling/interfaces/use-cases/create-hold.use-case.interface';
import { SchedulingErrorFactory } from '../../../shared/factories/scheduling-error.factory';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';
import { isFailure } from '../../../shared/types/result.type';

@Injectable()
export class CreateHoldUseCase
  extends BaseUseCase<CreateHoldUseCaseInput, BookingHold>
  implements ICreateHoldUseCase
{
  protected readonly logger = new Logger(CreateHoldUseCase.name);

  constructor(
    @Inject(IBookingHoldRepositoryToken)
    private readonly holdRepository: IBookingHoldRepository,
    @Inject(IBookingRepositoryToken)
    private readonly bookingRepository: IBookingRepository,
    private readonly messageBus: MessageBus,
  ) {
    super();
  }

  protected async handle(input: CreateHoldUseCaseInput): Promise<BookingHold> {
    const { tenantId, clinicId, professionalId, patientId, startAtUtc, endAtUtc } = input;

    const activeBookings = await this.bookingRepository.listByProfessionalAndRange(
      tenantId,
      professionalId,
      startAtUtc,
      endAtUtc,
    );

    if (
      activeBookings.some(
        (booking) =>
          booking.status !== 'cancelled' &&
          booking.status !== 'no_show' &&
          booking.endAtUtc > startAtUtc &&
          booking.startAtUtc < endAtUtc,
      )
    ) {
      throw SchedulingErrorFactory.bookingInvalidState(
        'Profissional ja possui compromisso no periodo',
      );
    }

    const overlappingHolds = await this.holdRepository.findActiveOverlap(
      tenantId,
      professionalId,
      startAtUtc,
      endAtUtc,
    );

    if (overlappingHolds.length > 0) {
      throw SchedulingErrorFactory.holdInvalidState('Ja existe um hold ativo conflitante');
    }

    const availability: AvailabilityOptions = {
      minAdvanceMinutes: 120,
      maxAdvanceDays: 90,
      bufferBetweenBookingsMinutes: 15,
    };

    const validation = BookingValidationService.validateAdvanceWindow({
      startAtUtc,
      nowUtc: new Date(),
      availability,
      context: 'hold_creation',
    });

    if (isFailure(validation)) {
      throw validation.error;
    }

    const hold = await this.holdRepository.create({
      tenantId,
      clinicId,
      professionalId,
      patientId,
      startAtUtc,
      endAtUtc,
      ttlExpiresAtUtc: BookingValidationService.computeHoldExpiry(startAtUtc, availability),
    });

    await this.messageBus.publish(
      DomainEvents.schedulingHoldCreated(hold.id, {
        tenantId,
        clinicId,
        professionalId,
        patientId,
        startAtUtc,
        endAtUtc,
        ttlExpiresAtUtc: hold.ttlExpiresAtUtc,
      }),
    );

    return hold;
  }
}
