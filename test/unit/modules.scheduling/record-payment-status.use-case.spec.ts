import { ConflictException, NotFoundException } from '@nestjs/common';

import { RecordPaymentStatusUseCase } from '@modules/scheduling/use-cases/record-payment-status.use-case';
import { IBookingRepository } from '@domain/scheduling/interfaces/repositories/booking.repository.interface';
import { MessageBus } from '@shared/messaging/message-bus';
import { DomainEvents } from '@shared/events/domain-events';
import { Booking } from '@domain/scheduling/types/scheduling.types';

const baseBooking = (overrides: Partial<Booking> = {}): Booking => ({
  id: 'booking-1',
  tenantId: 'tenant-1',
  clinicId: 'clinic-1',
  professionalId: 'professional-1',
  patientId: 'patient-1',
  source: 'clinic_portal',
  status: 'scheduled',
  paymentStatus: 'pending',
  holdId: 'hold-1',
  holdExpiresAtUtc: new Date('2025-10-08T09:55:00Z'),
  startAtUtc: new Date('2025-10-10T10:00:00Z'),
  endAtUtc: new Date('2025-10-10T11:00:00Z'),
  timezone: 'America/Sao_Paulo',
  lateToleranceMinutes: 15,
  recurrenceSeriesId: null,
  cancellationReason: null,
  pricingSplit: null,
  preconditionsPassed: false,
  anamneseRequired: false,
  anamneseOverrideReason: null,
  noShowMarkedAtUtc: null,
  createdAt: new Date('2025-10-08T09:00:00Z'),
  updatedAt: new Date('2025-10-08T09:00:00Z'),
  version: 1,
  ...overrides,
});

describe('RecordPaymentStatusUseCase', () => {
  let bookingRepository: jest.Mocked<IBookingRepository>;
  let messageBus: jest.Mocked<MessageBus>;
  let useCase: RecordPaymentStatusUseCase;

  beforeEach(() => {
    bookingRepository = {
      findById: jest.fn(),
      recordPaymentStatus: jest.fn(),
    } as unknown as jest.Mocked<IBookingRepository>;

    messageBus = {
      publish: jest.fn(),
    } as unknown as jest.Mocked<MessageBus>;

    useCase = new RecordPaymentStatusUseCase(bookingRepository, messageBus);
  });

  it('atualiza o status financeiro e publica evento', async () => {
    const existingBooking = baseBooking({ paymentStatus: 'pending' });
    const updatedBooking = baseBooking({
      paymentStatus: 'approved',
      updatedAt: new Date('2025-10-08T10:00:00Z'),
      version: existingBooking.version + 1,
    });

    bookingRepository.findById.mockResolvedValue(existingBooking);
    bookingRepository.recordPaymentStatus.mockResolvedValue(updatedBooking);

    const result = await useCase.executeOrThrow({
      tenantId: existingBooking.tenantId,
      bookingId: existingBooking.id,
      expectedVersion: 1,
      paymentStatus: 'approved',
      requesterId: 'user-1',
      requesterRole: 'CLINIC_OWNER',
    });

    expect(result).toEqual(updatedBooking);
    expect(bookingRepository.recordPaymentStatus).toHaveBeenCalledWith({
      tenantId: existingBooking.tenantId,
      bookingId: existingBooking.id,
      expectedVersion: 1,
      paymentStatus: 'approved',
    });
    expect(messageBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: DomainEvents.SCHEDULING_PAYMENT_STATUS_CHANGED,
        aggregateId: existingBooking.id,
      }),
    );
  });

  it('retorna o agendamento atual quando o status solicitado for o mesmo', async () => {
    const existingBooking = baseBooking({ paymentStatus: 'approved' });
    bookingRepository.findById.mockResolvedValue(existingBooking);

    const result = await useCase.executeOrThrow({
      tenantId: existingBooking.tenantId,
      bookingId: existingBooking.id,
      expectedVersion: 1,
      paymentStatus: 'approved',
      requesterId: 'user-1',
      requesterRole: 'CLINIC_OWNER',
    });

    expect(result).toEqual(existingBooking);
    expect(bookingRepository.recordPaymentStatus).not.toHaveBeenCalled();
    expect(messageBus.publish).not.toHaveBeenCalled();
  });

  it('lan a not found quando o agendamento n o existe', async () => {
    bookingRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.executeOrThrow({
        tenantId: 'tenant-1',
        bookingId: 'booking-inexistente',
        expectedVersion: 1,
        paymentStatus: 'approved',
        requesterId: 'user-1',
        requesterRole: 'CLINIC_OWNER',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(bookingRepository.recordPaymentStatus).not.toHaveBeenCalled();
  });

  it.each(['cancelled', 'no_show', 'completed'])(
    'lanca erro de estado invalido quando o agendamento esta %s',
    async (status) => {
      const bookingWithBlockedStatus = baseBooking({ status, paymentStatus: 'pending' });
      bookingRepository.findById.mockResolvedValue(bookingWithBlockedStatus);

      await expect(
        useCase.executeOrThrow({
          tenantId: bookingWithBlockedStatus.tenantId,
          bookingId: bookingWithBlockedStatus.id,
          expectedVersion: bookingWithBlockedStatus.version,
          paymentStatus: 'approved',
          requesterId: 'user-1',
          requesterRole: 'CLINIC_OWNER',
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(bookingRepository.recordPaymentStatus).not.toHaveBeenCalled();
    },
  );
});
