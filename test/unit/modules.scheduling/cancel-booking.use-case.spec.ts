import { ConflictException, NotFoundException } from '@nestjs/common';

import { CancelBookingUseCase } from '../../../src/modules/scheduling/use-cases/cancel-booking.use-case';
import { IBookingRepository } from '../../../src/domain/scheduling/interfaces/repositories/booking.repository.interface';
import { MessageBus } from '../../../src/shared/messaging/message-bus';
import { DomainEvents } from '../../../src/shared/events/domain-events';
import { Booking } from '../../../src/domain/scheduling/types/scheduling.types';

const baseBooking = (overrides: Partial<Booking> = {}): Booking => ({
  id: 'booking-1',
  tenantId: 'tenant-1',
  clinicId: 'clinic-1',
  professionalId: 'prof-1',
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
  createdAt: new Date('2025-10-01T10:00:00Z'),
  updatedAt: new Date('2025-10-01T10:00:00Z'),
  version: 1,
  ...overrides,
});

const createInput = () => ({
  tenantId: 'tenant-1',
  bookingId: 'booking-1',
  expectedVersion: 1,
  reason: 'patient_request' as const,
  requesterId: 'user-1',
  requesterRole: 'PROFESSIONAL',
  cancelledAtUtc: new Date('2025-10-08T12:00:00Z'),
});

describe('CancelBookingUseCase', () => {
  let bookingRepository: jest.Mocked<IBookingRepository>;
  let messageBus: jest.Mocked<MessageBus>;
  let useCase: CancelBookingUseCase;

  beforeEach(() => {
    bookingRepository = {
      findById: jest.fn(),
      updateStatus: jest.fn(),
    } as unknown as jest.Mocked<IBookingRepository>;

    messageBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<MessageBus>;

    useCase = new CancelBookingUseCase(bookingRepository, messageBus);
  });

  it('cancela um agendamento programado', async () => {
    const booking = baseBooking();
    const cancelled = baseBooking({
      status: 'cancelled',
      cancellationReason: 'patient_request',
      version: booking.version + 1,
      updatedAt: new Date('2025-10-08T12:00:00Z'),
    });

    bookingRepository.findById.mockResolvedValue(booking);
    bookingRepository.updateStatus.mockResolvedValue(cancelled);

    const result = await useCase.executeOrThrow(createInput());

    expect(result).toEqual(cancelled);
    expect(bookingRepository.updateStatus).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      bookingId: 'booking-1',
      expectedVersion: 1,
      status: 'cancelled',
      cancellationReason: 'patient_request',
    });
    expect(messageBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: DomainEvents.SCHEDULING_BOOKING_CANCELLED,
        aggregateId: 'booking-1',
      }),
    );
  });

  it('lança not found quando o agendamento não existe', async () => {
    bookingRepository.findById.mockResolvedValue(null);

    await expect(useCase.executeOrThrow(createInput())).rejects.toBeInstanceOf(NotFoundException);
    expect(bookingRepository.updateStatus).not.toHaveBeenCalled();
  });

  it('lança conflito quando o agendamento já está cancelado', async () => {
    bookingRepository.findById.mockResolvedValue(
      baseBooking({ status: 'cancelled', cancellationReason: 'system' }),
    );

    await expect(useCase.executeOrThrow(createInput())).rejects.toBeInstanceOf(ConflictException);
    expect(bookingRepository.updateStatus).not.toHaveBeenCalled();
  });

  it('lança conflito quando o agendamento já foi concluído', async () => {
    bookingRepository.findById.mockResolvedValue(
      baseBooking({ status: 'completed', paymentStatus: 'settled' }),
    );

    await expect(useCase.executeOrThrow(createInput())).rejects.toBeInstanceOf(ConflictException);
    expect(bookingRepository.updateStatus).not.toHaveBeenCalled();
  });
});
