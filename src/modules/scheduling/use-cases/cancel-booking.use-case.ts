import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import { Booking } from '../../../domain/scheduling/types/scheduling.types';
import {
  CancelBookingUseCaseInput,
  ICancelBookingUseCase,
} from '../../../domain/scheduling/interfaces/use-cases/cancel-booking.use-case.interface';
import {
  IBookingRepository,
  IBookingRepositoryToken,
} from '../../../domain/scheduling/interfaces/repositories/booking.repository.interface';
import { SchedulingErrorFactory } from '../../../shared/factories/scheduling-error.factory';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';

const CANCELABLE_STATUSES = new Set<Booking['status']>(['scheduled', 'confirmed']);

@Injectable()
export class CancelBookingUseCase
  extends BaseUseCase<CancelBookingUseCaseInput, Booking>
  implements ICancelBookingUseCase
{
  protected readonly logger = new Logger(CancelBookingUseCase.name);

  constructor(
    @Inject(IBookingRepositoryToken)
    private readonly bookingRepository: IBookingRepository,
    private readonly messageBus: MessageBus,
  ) {
    super();
  }

  protected async handle(input: CancelBookingUseCaseInput): Promise<Booking> {
    const {
      tenantId,
      bookingId,
      expectedVersion,
      reason,
      requesterId,
      requesterRole,
      cancelledAtUtc,
    } = input;

    const booking = await this.bookingRepository.findById(tenantId, bookingId);

    if (!booking) {
      throw SchedulingErrorFactory.bookingNotFound('Agendamento nao encontrado');
    }

    if (!CANCELABLE_STATUSES.has(booking.status)) {
      throw SchedulingErrorFactory.bookingInvalidState(
        `Nao e possivel cancelar agendamentos com status ${booking.status}`,
      );
    }

    const updatedBooking = await this.bookingRepository.updateStatus({
      tenantId,
      bookingId,
      expectedVersion,
      status: 'cancelled',
      cancellationReason: reason ?? null,
    });

    const originalProfessionalId = booking.originalProfessionalId ?? null;
    const coverageId = booking.coverageId ?? null;

    await this.messageBus.publish(
      DomainEvents.schedulingBookingCancelled(bookingId, {
        tenantId,
        professionalId: booking.professionalId,
        clinicId: booking.clinicId,
        patientId: booking.patientId,
        cancelledBy: requesterId,
        reason: reason ?? undefined,
        originalProfessionalId: originalProfessionalId ?? undefined,
        coverageId: coverageId ?? undefined,
      }),
    );

    this.logger.log(`Agendamento ${bookingId} cancelado por ${requesterId} (${requesterRole})`, {
      tenantId,
      cancelledAt: cancelledAtUtc ?? new Date(),
      reason: reason ?? null,
    });

    return updatedBooking;
  }
}
