import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import { Booking, RecurrenceOccurrence } from '../../../domain/scheduling/types/scheduling.types';
import { BookingValidationService } from '../../../domain/scheduling/services/booking-validation.service';
import {
  IBookingRepository,
  IBookingRepositoryToken,
} from '../../../domain/scheduling/interfaces/repositories/booking.repository.interface';
import {
  IRecurrenceRepository,
  IRecurrenceRepositoryToken,
} from '../../../domain/scheduling/interfaces/repositories/recurrence.repository.interface';
import {
  IRescheduleBookingUseCase,
  RescheduleBookingUseCaseInput,
} from '../../../domain/scheduling/interfaces/use-cases/reschedule-booking.use-case.interface';
import { SchedulingErrorFactory } from '../../../shared/factories/scheduling-error.factory';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';
import { isFailure } from '../../../shared/types/result.type';

@Injectable()
export class RescheduleBookingUseCase
  extends BaseUseCase<RescheduleBookingUseCaseInput, Booking>
  implements IRescheduleBookingUseCase
{
  protected readonly logger = new Logger(RescheduleBookingUseCase.name);

  constructor(
    @Inject(IBookingRepositoryToken)
    private readonly bookingRepository: IBookingRepository,
    @Inject(IRecurrenceRepositoryToken)
    private readonly recurrenceRepository: IRecurrenceRepository,
    private readonly messageBus: MessageBus,
  ) {
    super();
  }

  protected async handle(input: RescheduleBookingUseCaseInput): Promise<Booking> {
    const { tenantId, bookingId, expectedVersion, newStartAtUtc, newEndAtUtc, reason } = input;

    if (newStartAtUtc.getTime() >= newEndAtUtc.getTime()) {
      throw SchedulingErrorFactory.bookingInvalidState('Periodo invalido para reagendamento');
    }

    const booking = await this.bookingRepository.findById(tenantId, bookingId);

    if (!booking) {
      throw SchedulingErrorFactory.bookingNotFound('Agendamento nao encontrado');
    }

    const occurrence = await this.validateRecurrenceLimitsIfNeeded(tenantId, booking);

    const updatedBooking = await this.bookingRepository.reschedule({
      tenantId,
      bookingId,
      expectedVersion,
      newStartAtUtc,
      newEndAtUtc,
      reason,
    });

    if (occurrence) {
      await this.incrementOccurrenceRescheduleCounter(tenantId, occurrence);
    }

    await this.messageBus.publish(
      DomainEvents.schedulingBookingRescheduled(bookingId, {
        tenantId,
        professionalId: booking.professionalId,
        clinicId: booking.clinicId,
        patientId: booking.patientId,
        previousStartAtUtc: booking.startAtUtc,
        previousEndAtUtc: booking.endAtUtc,
        newStartAtUtc,
        newEndAtUtc,
      }),
    );

    return updatedBooking;
  }

  private async validateRecurrenceLimitsIfNeeded(
    tenantId: string,
    booking: Booking,
  ): Promise<RecurrenceOccurrence | null> {
    if (!booking.recurrenceSeriesId) {
      return null;
    }

    const series = await this.recurrenceRepository.findSeriesById(
      tenantId,
      booking.recurrenceSeriesId,
    );

    if (!series) {
      this.logger.warn(
        `Serie ${booking.recurrenceSeriesId} nao encontrada para booking ${booking.id}`,
      );
      return null;
    }

    const occurrence = await this.recurrenceRepository.findOccurrenceByBooking(
      tenantId,
      booking.id,
    );

    if (!occurrence) {
      this.logger.warn(
        `Booking ${booking.id} pertence a serie ${booking.recurrenceSeriesId} mas nao possui ocorrencia vinculada`,
      );
      return null;
    }

    const usage = await this.recurrenceRepository.getRescheduleUsage(
      tenantId,
      booking.recurrenceSeriesId,
      occurrence.id,
    );

    const limitsValidation = BookingValidationService.validateRescheduleLimits({
      limits: series.limits,
      occurrenceReschedules: usage.occurrenceReschedules,
      seriesReschedules: usage.seriesReschedules,
    });

    if (isFailure(limitsValidation)) {
      throw limitsValidation.error;
    }

    return occurrence;
  }

  private async incrementOccurrenceRescheduleCounter(
    tenantId: string,
    occurrence: RecurrenceOccurrence,
  ): Promise<void> {
    try {
      await this.recurrenceRepository.recordOccurrenceReschedule({
        tenantId,
        occurrenceId: occurrence.id,
        incrementBy: 1,
      });
    } catch (error) {
      const message = `Falha ao atualizar contador de recorrencia para ocorrencia ${occurrence.id}`;
      if (error instanceof Error) {
        this.logger.error(message, error.stack);
      } else {
        this.logger.error(message, JSON.stringify(error));
      }
      throw error;
    }
  }
}
