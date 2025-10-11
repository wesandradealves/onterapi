import { ConflictException } from '@nestjs/common';

import { RescheduleBookingUseCase } from '@modules/scheduling/use-cases/reschedule-booking.use-case';
import { IBookingRepository } from '@domain/scheduling/interfaces/repositories/booking.repository.interface';
import { IRecurrenceRepository } from '@domain/scheduling/interfaces/repositories/recurrence.repository.interface';
import { MessageBus } from '@shared/messaging/message-bus';
import { DomainEvents } from '@shared/events/domain-events';

const baseBooking = () => ({
  id: 'booking-1',
  tenantId: 'tenant-1',
  professionalId: 'prof-1',
  clinicId: 'clinic-1',
  patientId: 'patient-1',
  source: 'clinic_portal',
  status: 'confirmed',
  paymentStatus: 'approved' as const,
  holdId: null,
  holdExpiresAtUtc: null,
  startAtUtc: new Date('2025-10-10T10:00:00Z'),
  endAtUtc: new Date('2025-10-10T11:00:00Z'),
  timezone: 'America/Sao_Paulo',
  lateToleranceMinutes: 15,
  recurrenceSeriesId: null as string | null,
  cancellationReason: null,
  pricingSplit: null,
  preconditionsPassed: true,
  anamneseRequired: false,
  anamneseOverrideReason: null,
  noShowMarkedAtUtc: null,
  createdAt: new Date('2025-10-01T10:00:00Z'),
  updatedAt: new Date('2025-10-01T10:00:00Z'),
  version: 1,
});

describe('RescheduleBookingUseCase', () => {
  let bookingRepository: jest.Mocked<IBookingRepository>;
  let recurrenceRepository: jest.Mocked<IRecurrenceRepository>;
  let messageBus: jest.Mocked<MessageBus>;
  let useCase: RescheduleBookingUseCase;

  const input = {
    tenantId: 'tenant-1',
    bookingId: 'booking-1',
    expectedVersion: 1,
    newStartAtUtc: new Date('2025-10-11T12:00:00Z'),
    newEndAtUtc: new Date('2025-10-11T13:00:00Z'),
    requesterId: 'user-1',
    requesterRole: 'PROFESSIONAL',
    reason: 'Patient request',
  };

  beforeEach(() => {
    bookingRepository = {
      findById: jest.fn(),
      reschedule: jest.fn(),
    } as unknown as jest.Mocked<IBookingRepository>;

    recurrenceRepository = {
      findOccurrenceByBooking: jest.fn(),
      getRescheduleUsage: jest.fn(),
      findSeriesById: jest.fn(),
      recordOccurrenceReschedule: jest.fn(),
    } as unknown as jest.Mocked<IRecurrenceRepository>;

    messageBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<MessageBus>;

    useCase = new RescheduleBookingUseCase(bookingRepository, recurrenceRepository, messageBus);
  });

  it('reschedules booking and updates recurrence counters', async () => {
    const booking = { ...baseBooking(), recurrenceSeriesId: 'series-1' };
    const occurrence = {
      id: 'occ-1',
      tenantId: booking.tenantId,
      seriesId: 'series-1',
      bookingId: booking.id,
      startAtUtc: booking.startAtUtc,
      endAtUtc: booking.endAtUtc,
      reschedulesCount: 0,
      createdAt: new Date('2025-10-01T10:00:00Z'),
      updatedAt: new Date('2025-10-01T10:00:00Z'),
    };

    bookingRepository.findById.mockResolvedValue(booking);
    recurrenceRepository.findSeriesById.mockResolvedValue({
      id: 'series-1',
      tenantId: booking.tenantId,
      professionalId: booking.professionalId,
      clinicId: booking.clinicId,
      pattern: 'weekly',
      patternValue: '1',
      startDateUtc: new Date('2025-10-01T00:00:00Z'),
      endDateUtc: null,
      skipHolidays: true,
      holidayPolicy: 'skip',
      limits: {
        maxReschedulesPerOccurrence: 2,
        maxReschedulesPerSeries: 5,
      },
      createdAt: new Date('2025-10-01T00:00:00Z'),
      updatedAt: new Date('2025-10-01T00:00:00Z'),
    });
    recurrenceRepository.findOccurrenceByBooking.mockResolvedValue(occurrence);
    recurrenceRepository.getRescheduleUsage.mockResolvedValue({
      occurrenceReschedules: 0,
      seriesReschedules: 0,
    });
    bookingRepository.reschedule.mockImplementation(async () => ({
      ...booking,
      startAtUtc: input.newStartAtUtc,
      endAtUtc: input.newEndAtUtc,
      version: booking.version + 1,
      updatedAt: new Date('2025-10-08T12:00:00Z'),
    }));

    const result = await useCase.executeOrThrow(input);

    expect(result.startAtUtc).toEqual(input.newStartAtUtc);
    expect(recurrenceRepository.recordOccurrenceReschedule).toHaveBeenCalledWith({
      tenantId: booking.tenantId,
      occurrenceId: occurrence.id,
      incrementBy: 1,
    });
    expect(messageBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: DomainEvents.SCHEDULING_BOOKING_RESCHEDULED,
        aggregateId: booking.id,
      }),
    );
  });

  it('throws conflict when limits reached', async () => {
    const booking = { ...baseBooking(), recurrenceSeriesId: 'series-1' };
    bookingRepository.findById.mockResolvedValue(booking);
    recurrenceRepository.findSeriesById.mockResolvedValue({
      id: 'series-1',
      tenantId: booking.tenantId,
      professionalId: booking.professionalId,
      clinicId: booking.clinicId,
      pattern: 'weekly',
      patternValue: '1',
      startDateUtc: new Date('2025-10-01T00:00:00Z'),
      endDateUtc: null,
      skipHolidays: true,
      holidayPolicy: 'skip',
      limits: {
        maxReschedulesPerOccurrence: 1,
        maxReschedulesPerSeries: 3,
      },
      createdAt: new Date('2025-10-01T00:00:00Z'),
      updatedAt: new Date('2025-10-01T00:00:00Z'),
    });
    recurrenceRepository.findOccurrenceByBooking.mockResolvedValue({
      id: 'occ-1',
      tenantId: booking.tenantId,
      seriesId: 'series-1',
      bookingId: booking.id,
      startAtUtc: booking.startAtUtc,
      endAtUtc: booking.endAtUtc,
      reschedulesCount: 2,
      createdAt: new Date('2025-10-01T10:00:00Z'),
      updatedAt: new Date('2025-10-01T10:00:00Z'),
    });
    recurrenceRepository.getRescheduleUsage.mockResolvedValue({
      occurrenceReschedules: 1,
      seriesReschedules: 3,
    });

    await expect(useCase.executeOrThrow(input)).rejects.toBeInstanceOf(ConflictException);
  });

  it('reschedules one-off booking without recurrence', async () => {
    const booking = baseBooking();
    bookingRepository.findById.mockResolvedValue(booking);
    bookingRepository.reschedule.mockImplementation(async () => ({
      ...booking,
      startAtUtc: input.newStartAtUtc,
      endAtUtc: input.newEndAtUtc,
      version: booking.version + 1,
      updatedAt: new Date('2025-10-08T12:00:00Z'),
    }));

    const result = await useCase.executeOrThrow(input);

    expect(result.startAtUtc).toEqual(input.newStartAtUtc);
    expect(recurrenceRepository.recordOccurrenceReschedule).not.toHaveBeenCalled();
  });
});
