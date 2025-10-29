import { ForbiddenException, GoneException, NotFoundException } from '@nestjs/common';

import { ConfirmBookingUseCase } from '@modules/scheduling/use-cases/confirm-booking.use-case';
import { IBookingRepository } from '@domain/scheduling/interfaces/repositories/booking.repository.interface';
import { IBookingHoldRepository } from '@domain/scheduling/interfaces/repositories/booking-hold.repository.interface';
import { MessageBus } from '@shared/messaging/message-bus';
import { DomainEvents } from '@shared/events/domain-events';

const createBooking = (overrides: Partial<ReturnType<typeof baseBooking>> = {}) => ({
  ...baseBooking(),
  ...overrides,
});

function baseBooking() {
  return {
    id: 'booking-1',
    tenantId: 'tenant-1',
    professionalId: 'prof-1',
    originalProfessionalId: null,
    coverageId: null,
    clinicId: 'clinic-1',
    patientId: 'patient-1',
    source: 'clinic_portal',
    status: 'scheduled',
    paymentStatus: 'pending',
    holdId: 'hold-1',
    holdExpiresAtUtc: new Date('2025-10-08T09:50:00Z'),
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
    createdAt: new Date('2025-10-01T10:00:00Z'),
    updatedAt: new Date('2025-10-01T10:00:00Z'),
    version: 1,
  };
}

const createInput = () => ({
  tenantId: 'tenant-1',
  bookingId: 'booking-1',
  holdId: 'hold-1',
  paymentStatus: 'approved' as const,
  requesterId: 'user-1',
  requesterRole: 'PROFESSIONAL',
  confirmationAtUtc: new Date('2025-10-08T09:40:00Z'),
});

describe('ConfirmBookingUseCase', () => {
  let bookingRepository: jest.Mocked<IBookingRepository>;
  let holdRepository: jest.Mocked<IBookingHoldRepository>;
  let messageBus: jest.Mocked<MessageBus>;
  let useCase: ConfirmBookingUseCase;

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2025-10-08T09:30:00Z') });

    bookingRepository = {
      findById: jest.fn(),
      updateStatus: jest.fn(),
    } as unknown as jest.Mocked<IBookingRepository>;

    holdRepository = {
      findById: jest.fn(),
      updateStatus: jest.fn(),
    } as unknown as jest.Mocked<IBookingHoldRepository>;

    messageBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<MessageBus>;

    useCase = new ConfirmBookingUseCase(bookingRepository, holdRepository, messageBus);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('confirma o agendamento quando hold ativo e pagamento aprovado', async () => {
    const booking = createBooking();
    const hold = {
      id: 'hold-1',
      tenantId: 'tenant-1',
      clinicId: 'clinic-1',
      professionalId: 'prof-1',
      patientId: 'patient-1',
      serviceTypeId: 'service-1',
      startAtUtc: booking.startAtUtc,
      endAtUtc: booking.endAtUtc,
      ttlExpiresAtUtc: new Date('2025-10-08T09:55:00Z'),
      status: 'active',
      createdAt: new Date('2025-10-08T09:00:00Z'),
      updatedAt: new Date('2025-10-08T09:00:00Z'),
      version: 1,
    };

    bookingRepository.findById.mockResolvedValue(booking);
    holdRepository.findById.mockResolvedValue(hold);
    bookingRepository.updateStatus.mockImplementation(async () => ({
      ...booking,
      status: 'confirmed',
      paymentStatus: 'approved',
      version: booking.version + 1,
      updatedAt: new Date('2025-10-08T10:00:00Z'),
    }));
    holdRepository.updateStatus.mockImplementation(
      async () =>
        ({
          ...hold,
          status: 'confirmed',
          version: hold.version + 1,
          updatedAt: new Date('2025-10-08T10:00:00Z'),
        }) as any,
    );

    const result = await useCase.executeOrThrow(createInput());

    expect(result.status).toBe('confirmed');
    expect(holdRepository.updateStatus).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      holdId: 'hold-1',
      expectedVersion: hold.version,
      status: 'confirmed',
    });
    expect(messageBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: DomainEvents.SCHEDULING_BOOKING_CONFIRMED,
        aggregateId: 'booking-1',
      }),
    );
  });

  it('propaga dados de cobertura ao confirmar agendamento coberto', async () => {
    const booking = createBooking({
      professionalId: 'prof-cover',
      originalProfessionalId: 'prof-owner',
      coverageId: 'coverage-1',
    });
    const hold = {
      id: 'hold-1',
      tenantId: 'tenant-1',
      clinicId: 'clinic-1',
      professionalId: 'prof-cover',
      patientId: 'patient-1',
      serviceTypeId: 'service-1',
      startAtUtc: booking.startAtUtc,
      endAtUtc: booking.endAtUtc,
      ttlExpiresAtUtc: new Date('2025-10-08T09:55:00Z'),
      status: 'active',
      createdAt: new Date('2025-10-08T09:00:00Z'),
      updatedAt: new Date('2025-10-08T09:00:00Z'),
      version: 1,
    };

    bookingRepository.findById.mockResolvedValue(booking);
    holdRepository.findById.mockResolvedValue(hold);
    bookingRepository.updateStatus.mockResolvedValue({
      ...booking,
      status: 'confirmed',
      paymentStatus: 'approved',
    });

    await useCase.executeOrThrow(createInput());

    const event = messageBus.publish.mock.calls[0][0];
    expect(event.payload.originalProfessionalId).toBe('prof-owner');
    expect(event.payload.coverageId).toBe('coverage-1');
  });

  it('lan a not found quando o agendamento n o existe', async () => {
    bookingRepository.findById.mockResolvedValue(null);

    await expect(useCase.executeOrThrow(createInput())).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lan a not found quando o hold n o existe', async () => {
    bookingRepository.findById.mockResolvedValue(createBooking());
    holdRepository.findById.mockResolvedValue(null);

    await expect(useCase.executeOrThrow(createInput())).rejects.toThrow('Hold nao encontrado');
  });

  it('lan a gone quando o hold expirou', async () => {
    const booking = createBooking();
    bookingRepository.findById.mockResolvedValue(booking);
    holdRepository.findById.mockResolvedValue({
      id: 'hold-1',
      tenantId: 'tenant-1',
      clinicId: 'clinic-1',
      professionalId: 'prof-1',
      patientId: 'patient-1',
      startAtUtc: booking.startAtUtc,
      endAtUtc: booking.endAtUtc,
      ttlExpiresAtUtc: new Date('2025-10-08T09:00:00Z'),
      status: 'active',
      createdAt: new Date('2025-10-08T09:00:00Z'),
      updatedAt: new Date('2025-10-08T09:00:00Z'),
      version: 1,
    });

    await expect(
      useCase.executeOrThrow({
        ...createInput(),
        confirmationAtUtc: new Date('2025-10-08T10:15:00Z'),
      }),
    ).rejects.toBeInstanceOf(GoneException);
  });

  it('lan a erro de pagamento quando o status informado n o   aprovado', async () => {
    const booking = createBooking({ paymentStatus: 'pending' });
    bookingRepository.findById.mockResolvedValue(booking);
    holdRepository.findById.mockResolvedValue({
      id: 'hold-1',
      tenantId: 'tenant-1',
      clinicId: 'clinic-1',
      professionalId: 'prof-1',
      patientId: 'patient-1',
      startAtUtc: booking.startAtUtc,
      endAtUtc: booking.endAtUtc,
      ttlExpiresAtUtc: new Date('2025-10-08T09:55:00Z'),
      status: 'active',
      createdAt: new Date('2025-10-08T09:00:00Z'),
      updatedAt: new Date('2025-10-08T09:00:00Z'),
      version: 1,
    });

    await expect(
      useCase.executeOrThrow({
        ...createInput(),
        paymentStatus: 'pending',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('usa data atual quando confirma  o n o possui timestamp', async () => {
    const booking = createBooking();
    const hold = {
      id: 'hold-1',
      tenantId: 'tenant-1',
      clinicId: 'clinic-1',
      professionalId: 'prof-1',
      patientId: 'patient-1',
      serviceTypeId: 'service-1',
      startAtUtc: booking.startAtUtc,
      endAtUtc: booking.endAtUtc,
      ttlExpiresAtUtc: new Date('2025-10-08T09:55:00Z'),
      status: 'active',
      createdAt: new Date('2025-10-08T09:00:00Z'),
      updatedAt: new Date('2025-10-08T09:00:00Z'),
      version: 1,
    };
    bookingRepository.findById.mockResolvedValue(booking);
    holdRepository.findById.mockResolvedValue(hold);
    bookingRepository.updateStatus.mockResolvedValue({
      ...booking,
      status: 'confirmed',
      paymentStatus: 'approved',
    });
    const now = new Date('2025-10-08T09:35:00Z');
    jest.setSystemTime(now);

    await useCase.executeOrThrow({
      ...createInput(),
      confirmationAtUtc: undefined,
    });

    const event = messageBus.publish.mock.calls[0][0];
    expect(event.payload.confirmedAt.toISOString()).toBe(now.toISOString());
  });
});
