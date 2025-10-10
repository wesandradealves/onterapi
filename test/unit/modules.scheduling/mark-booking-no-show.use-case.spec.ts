import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { MarkBookingNoShowUseCase } from '@modules/scheduling/use-cases/mark-booking-no-show.use-case';
import { IBookingRepository } from '@domain/scheduling/interfaces/repositories/booking.repository.interface';
import { MessageBus } from '@shared/messaging/message-bus';
import { Booking } from '@domain/scheduling/types/scheduling.types';

const baseBooking = (overrides: Partial<Booking> = {}): Booking => ({
  id: 'booking-1',
  tenantId: 'tenant-1',
  clinicId: 'clinic-1',
  professionalId: 'professional-1',
  patientId: 'patient-1',
  source: 'clinic_portal',
  status: 'confirmed',
  paymentStatus: 'approved',
  holdId: 'hold-1',
  holdExpiresAtUtc: new Date('2025-10-08T09:55:00Z'),
  startAtUtc: new Date('2025-10-10T10:00:00Z'),
  endAtUtc: new Date('2025-10-10T11:00:00Z'),
  timezone: 'America/Sao_Paulo',
  lateToleranceMinutes: 15,
  recurrenceSeriesId: null,
  cancellationReason: null,
  pricingSplit: null,
  preconditionsPassed: true,
  anamneseRequired: false,
  anamneseOverrideReason: null,
  noShowMarkedAtUtc: null,
  createdAt: new Date('2025-10-08T09:00:00Z'),
  updatedAt: new Date('2025-10-08T09:00:00Z'),
  version: 1,
  ...overrides,
});

describe('MarkBookingNoShowUseCase', () => {
  let bookingRepository: jest.Mocked<IBookingRepository>;
  let messageBus: jest.Mocked<MessageBus>;
  let useCase: MarkBookingNoShowUseCase;

  beforeEach(() => {
    bookingRepository = {
      findById: jest.fn(),
      markNoShow: jest.fn(),
    } as unknown as jest.Mocked<IBookingRepository>;

    messageBus = {
      publish: jest.fn(),
    } as unknown as jest.Mocked<MessageBus>;

    useCase = new MarkBookingNoShowUseCase(bookingRepository, messageBus);
  });

  it('marca o agendamento como no-show e publica evento', async () => {
    const booking = baseBooking({ startAtUtc: new Date('2025-10-10T09:00:00Z') });
    const markedAt = new Date('2025-10-10T09:30:00Z');
    const updatedBooking = baseBooking({
      status: 'no_show',
      noShowMarkedAtUtc: markedAt,
      version: booking.version + 1,
    });

    bookingRepository.findById.mockResolvedValue(booking);
    bookingRepository.markNoShow.mockResolvedValue(updatedBooking);

    const result = await useCase.executeOrThrow({
      tenantId: booking.tenantId,
      bookingId: booking.id,
      expectedVersion: booking.version,
      markedAtUtc: markedAt,
      requesterId: 'user-1',
      requesterRole: 'CLINIC_OWNER',
    });

    expect(result).toEqual(updatedBooking);
    expect(bookingRepository.markNoShow).toHaveBeenCalledWith({
      tenantId: booking.tenantId,
      bookingId: booking.id,
      expectedVersion: booking.version,
      markedAtUtc: markedAt,
    });
    expect(messageBus.publish).toHaveBeenCalled();
  });

  it('lan�a not found quando o agendamento n�o existe', async () => {
    bookingRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.executeOrThrow({
        tenantId: 'tenant-1',
        bookingId: 'inexistente',
        expectedVersion: 1,
        markedAtUtc: new Date(),
        requesterId: 'user-1',
        requesterRole: 'CLINIC_OWNER',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(bookingRepository.markNoShow).not.toHaveBeenCalled();
  });

  it('lan�a conflito quando o agendamento j� est� marcado como no-show', async () => {
    const booking = baseBooking({ status: 'no_show', noShowMarkedAtUtc: new Date() });
    bookingRepository.findById.mockResolvedValue(booking);

    await expect(
      useCase.executeOrThrow({
        tenantId: booking.tenantId,
        bookingId: booking.id,
        expectedVersion: booking.version,
        markedAtUtc: new Date(),
        requesterId: 'user-1',
        requesterRole: 'CLINIC_OWNER',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(bookingRepository.markNoShow).not.toHaveBeenCalled();
  });

  it('lan�a conflito quando a toler�ncia ainda n�o expirou', async () => {
    const booking = baseBooking({
      startAtUtc: new Date('2025-10-10T10:00:00Z'),
      lateToleranceMinutes: 30,
    });
    bookingRepository.findById.mockResolvedValue(booking);

    await expect(
      useCase.executeOrThrow({
        tenantId: booking.tenantId,
        bookingId: booking.id,
        expectedVersion: booking.version,
        markedAtUtc: new Date('2025-10-10T10:10:00Z'),
        requesterId: 'user-1',
        requesterRole: 'CLINIC_OWNER',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(bookingRepository.markNoShow).not.toHaveBeenCalled();
  });
});
