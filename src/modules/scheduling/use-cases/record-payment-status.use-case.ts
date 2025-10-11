import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import {
  IBookingRepository,
  IBookingRepositoryToken,
} from '../../../domain/scheduling/interfaces/repositories/booking.repository.interface';
import {
  IRecordPaymentStatusUseCase,
  RecordPaymentStatusUseCaseInput,
} from '../../../domain/scheduling/interfaces/use-cases/record-payment-status.use-case.interface';
import { Booking } from '../../../domain/scheduling/types/scheduling.types';
import { SchedulingErrorFactory } from '../../../shared/factories/scheduling-error.factory';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';

@Injectable()
export class RecordPaymentStatusUseCase
  extends BaseUseCase<RecordPaymentStatusUseCaseInput, Booking>
  implements IRecordPaymentStatusUseCase
{
  private static readonly BLOCKED_STATUSES: Booking['status'][] = [
    'cancelled',
    'no_show',
    'completed',
  ];

  protected readonly logger = new Logger(RecordPaymentStatusUseCase.name);

  constructor(
    @Inject(IBookingRepositoryToken)
    private readonly bookingRepository: IBookingRepository,
    private readonly messageBus: MessageBus,
  ) {
    super();
  }

  protected async handle(input: RecordPaymentStatusUseCaseInput): Promise<Booking> {
    const { tenantId, bookingId, expectedVersion, paymentStatus, requesterId, requesterRole } =
      input;

    const booking = await this.bookingRepository.findById(tenantId, bookingId);

    if (!booking) {
      throw SchedulingErrorFactory.bookingNotFound('Agendamento nao encontrado');
    }

    if (RecordPaymentStatusUseCase.BLOCKED_STATUSES.includes(booking.status)) {
      throw SchedulingErrorFactory.bookingInvalidState(
        `Nao e permitido atualizar pagamento quando o status e ${booking.status}`,
      );
    }

    if (booking.paymentStatus === paymentStatus) {
      this.logger.log('Pagamento ja possui o status informado. Nenhuma atualizacao necessaria.', {
        tenantId,
        bookingId,
        paymentStatus,
        requesterId,
        requesterRole,
      });

      return booking;
    }

    const updatedBooking = await this.bookingRepository.recordPaymentStatus({
      tenantId,
      bookingId,
      expectedVersion,
      paymentStatus,
    });

    await this.messageBus.publish(
      DomainEvents.schedulingPaymentStatusChanged(bookingId, {
        tenantId,
        professionalId: booking.professionalId,
        clinicId: booking.clinicId,
        patientId: booking.patientId,
        previousStatus: booking.paymentStatus,
        newStatus: updatedBooking.paymentStatus,
      }),
    );

    return updatedBooking;
  }
}
