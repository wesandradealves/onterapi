import { ConflictException, GoneException, NotFoundException } from '@nestjs/common';

import { CreateBookingUseCase } from '@modules/scheduling/use-cases/create-booking.use-case';
import { IBookingRepository } from '@domain/scheduling/interfaces/repositories/booking.repository.interface';
import { IBookingHoldRepository } from '@domain/scheduling/interfaces/repositories/booking-hold.repository.interface';
import { BookingValidationService } from '@domain/scheduling/services/booking-validation.service';
import { MessageBus } from '@shared/messaging/message-bus';
import { DomainEvents } from '@shared/events/domain-events';
import { Booking } from '@domain/scheduling/types/scheduling.types';

const baseHold = () => ({
  id: 'hold-1',
  tenantId: 'tenant-1',
  clinicId: 'clinic-1',
  professionalId: 'prof-1',
  patientId: 'patient-1',
  serviceTypeId: 'service-1',
  startAtUtc: new Date('2025-10-10T10:00:00Z'),
  endAtUtc: new Date('2025-10-10T11:00:00Z'),
  ttlExpiresAtUtc: new Date('2025-10-08T09:55:00Z'),
  status: 'active' as const,
  createdAt: new Date('2025-10-08T09:00:00Z'),
  updatedAt: new Date('2025-10-08T09:00:00Z'),
  version: 1,
});

const baseBooking = (): Booking => ({
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
  createdAt: new Date('2025-10-08T09:40:00Z'),
  updatedAt: new Date('2025-10-08T09:40:00Z'),
  version: 1,
});

const createInput = () => ({
  tenantId: 'tenant-1',
  holdId: 'hold-1',
  source: 'clinic_portal' as const,
  timezone: 'America/Sao_Paulo',
  requesterId: 'user-1',
  requesterRole: 'PROFESSIONAL',
  requestedAtUtc: new Date('2025-10-08T09:40:00Z'),
});

describe('CreateBookingUseCase', () => {
  let bookingRepository: jest.Mocked<IBookingRepository>;
  let holdRepository: jest.Mocked<IBookingHoldRepository>;
  let messageBus: jest.Mocked<MessageBus>;
  let useCase: CreateBookingUseCase;

  afterEach(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    bookingRepository = {
      create: jest.fn(),
      findByHold: jest.fn(),
    } as unknown as jest.Mocked<IBookingRepository>;

    holdRepository = {
      findById: jest.fn(),
      updateStatus: jest.fn(),
    } as unknown as jest.Mocked<IBookingHoldRepository>;

    messageBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<MessageBus>;

    useCase = new CreateBookingUseCase(bookingRepository, holdRepository, messageBus);
  });

  it('cria um agendamento quando o hold est  ativo e dispon vel', async () => {
    const hold = baseHold();
    const booking = baseBooking();

    holdRepository.findById.mockResolvedValue(hold);
    bookingRepository.findByHold.mockResolvedValue(null);
    holdRepository.updateStatus.mockResolvedValue({
      ...hold,
      status: 'confirmed',
      version: hold.version + 1,
    } as any);
    bookingRepository.create.mockResolvedValue(booking);

    const result = await useCase.executeOrThrow(createInput());

    expect(result).toEqual(booking);
    expect(bookingRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: hold.tenantId,
        clinicId: hold.clinicId,
        professionalId: hold.professionalId,
        patientId: hold.patientId,
        status: 'scheduled',
        paymentStatus: 'pending',
        holdId: hold.id,
        holdExpiresAtUtc: hold.ttlExpiresAtUtc,
        timezone: 'America/Sao_Paulo',
      }),
    );
    expect(messageBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: DomainEvents.SCHEDULING_BOOKING_CREATED,
        aggregateId: booking.id,
      }),
    );
  });

  it('lan a not found quando o hold n o   encontrado', async () => {
    holdRepository.findById.mockResolvedValue(null);

    await expect(useCase.executeOrThrow(createInput())).rejects.toBeInstanceOf(NotFoundException);
    expect(holdRepository.updateStatus).not.toHaveBeenCalled();
  });

  it('lan a gone quando o hold est  expirado', async () => {
    const hold = baseHold();
    hold.ttlExpiresAtUtc = new Date('2025-10-08T09:30:00Z');

    holdRepository.findById.mockResolvedValue(hold);

    await expect(useCase.executeOrThrow(createInput())).rejects.toBeInstanceOf(GoneException);
    expect(holdRepository.updateStatus).not.toHaveBeenCalled();
  });

  it('lan a conflito quando o hold j  foi utilizado', async () => {
    const hold = baseHold();
    holdRepository.findById.mockResolvedValue(hold);
    bookingRepository.findByHold.mockResolvedValue(baseBooking());

    await expect(useCase.executeOrThrow(createInput())).rejects.toBeInstanceOf(ConflictException);
    expect(holdRepository.updateStatus).not.toHaveBeenCalled();
  });

  it('atualiza o hold para confirmado ao criar o agendamento', async () => {
    const hold = baseHold();

    holdRepository.findById.mockResolvedValue(hold);
    bookingRepository.findByHold.mockResolvedValue(null);
    holdRepository.updateStatus.mockResolvedValue({
      ...hold,
      status: 'confirmed',
      version: hold.version + 1,
    } as any);
    bookingRepository.create.mockResolvedValue(baseBooking());

    await useCase.executeOrThrow(createInput());

    expect(holdRepository.updateStatus).toHaveBeenCalledWith({
      tenantId: hold.tenantId,
      holdId: hold.id,
      expectedVersion: hold.version,
      status: 'confirmed',
    });
  });

  it('usa instante atual quando requestedAtUtc n o informado', async () => {
    const hold = baseHold();
    holdRepository.findById.mockResolvedValue(hold);
    bookingRepository.findByHold.mockResolvedValue(null);
    holdRepository.updateStatus.mockResolvedValue({
      ...hold,
      status: 'confirmed',
      version: hold.version + 1,
    } as any);
    bookingRepository.create.mockResolvedValue(baseBooking());
    const now = new Date('2025-10-08T09:20:00Z');
    jest.useFakeTimers().setSystemTime(now);
    const validationSpy = jest.spyOn(BookingValidationService, 'validateHoldForBookingCreation');

    await useCase.executeOrThrow({
      ...createInput(),
      requestedAtUtc: undefined,
    } as any);

    expect(validationSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        nowUtc: now,
      }),
    );
    validationSpy.mockRestore();
  });
});
