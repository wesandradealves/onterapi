import { ConflictException } from '@nestjs/common';

import { CreateHoldUseCase } from '@modules/scheduling/use-cases/create-hold.use-case';
import { IBookingRepository } from '@domain/scheduling/interfaces/repositories/booking.repository.interface';
import { IBookingHoldRepository } from '@domain/scheduling/interfaces/repositories/booking-hold.repository.interface';
import { MessageBus } from '@shared/messaging/message-bus';
import { DomainEvents } from '@shared/events/domain-events';

const createInput = () => ({
  tenantId: 'tenant-1',
  clinicId: 'clinic-1',
  professionalId: 'prof-1',
  patientId: 'patient-1',
  startAtUtc: new Date('2025-10-10T10:00:00Z'),
  endAtUtc: new Date('2025-10-10T11:00:00Z'),
  requesterId: 'user-1',
  requesterRole: 'PROFESSIONAL',
});

describe('CreateHoldUseCase', () => {
  let bookingRepository: jest.Mocked<IBookingRepository>;
  let holdRepository: jest.Mocked<IBookingHoldRepository>;
  let messageBus: jest.Mocked<MessageBus>;
  let useCase: CreateHoldUseCase;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2025-10-08T08:00:00Z'));

    bookingRepository = {
      listByProfessionalAndRange: jest.fn(),
    } as unknown as jest.Mocked<IBookingRepository>;

    holdRepository = {
      create: jest.fn(),
      findActiveOverlap: jest.fn(),
    } as unknown as jest.Mocked<IBookingHoldRepository>;

    messageBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<MessageBus>;

    useCase = new CreateHoldUseCase(holdRepository, bookingRepository, messageBus);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates hold when no conflicts exist', async () => {
    const input = createInput();
    bookingRepository.listByProfessionalAndRange.mockResolvedValue([]);
    holdRepository.findActiveOverlap.mockResolvedValue([]);
    holdRepository.create.mockImplementation(async (payload) => ({
      id: 'hold-1',
      tenantId: payload.tenantId,
      clinicId: payload.clinicId,
      professionalId: payload.professionalId,
      patientId: payload.patientId,
      startAtUtc: payload.startAtUtc,
      endAtUtc: payload.endAtUtc,
      ttlExpiresAtUtc: payload.ttlExpiresAtUtc,
      status: 'active',
      createdAt: new Date('2025-10-08T10:00:00Z'),
      updatedAt: new Date('2025-10-08T10:00:00Z'),
      version: 1,
    }));

    const hold = await useCase.executeOrThrow(input);

    expect(holdRepository.create).toHaveBeenCalled();
    expect(messageBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: DomainEvents.SCHEDULING_HOLD_CREATED,
        aggregateId: 'hold-1',
      }),
    );
    expect(hold.status).toBe('active');
  });

  it('throws conflict when professional already booked', async () => {
    bookingRepository.listByProfessionalAndRange.mockResolvedValue([
      {
        id: 'booking-1',
        tenantId: 'tenant-1',
        clinicId: 'clinic-1',
        professionalId: 'prof-1',
        patientId: 'patient-2',
        source: 'clinic_portal',
        status: 'confirmed',
        paymentStatus: 'approved',
        holdId: null,
        holdExpiresAtUtc: null,
        startAtUtc: new Date('2025-10-10T10:30:00Z'),
        endAtUtc: new Date('2025-10-10T11:30:00Z'),
        timezone: 'America/Sao_Paulo',
        lateToleranceMinutes: 15,
        recurrenceSeriesId: null,
        cancellationReason: null,
        pricingSplit: null,
        preconditionsPassed: true,
        anamneseRequired: false,
        anamneseOverrideReason: null,
        noShowMarkedAtUtc: null,
        createdAt: new Date('2025-10-01T10:00:00Z'),
        updatedAt: new Date('2025-10-01T10:00:00Z'),
        version: 1,
      },
    ]);

    await expect(useCase.executeOrThrow(createInput())).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws conflict when overlapping hold exists', async () => {
    bookingRepository.listByProfessionalAndRange.mockResolvedValue([]);
    holdRepository.findActiveOverlap.mockResolvedValue([
      {
        id: 'hold-1',
        tenantId: 'tenant-1',
        clinicId: 'clinic-1',
        professionalId: 'prof-1',
        patientId: 'patient-9',
        startAtUtc: new Date('2025-10-10T09:30:00Z'),
        endAtUtc: new Date('2025-10-10T10:30:00Z'),
        ttlExpiresAtUtc: new Date('2025-10-10T09:40:00Z'),
        status: 'active',
        createdAt: new Date('2025-10-08T09:00:00Z'),
        updatedAt: new Date('2025-10-08T09:00:00Z'),
        version: 1,
      },
    ]);

    await expect(useCase.executeOrThrow(createInput())).rejects.toBeInstanceOf(ConflictException);
  });
});
