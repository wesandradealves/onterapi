import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

import { CreateHoldUseCase } from '@modules/scheduling/use-cases/create-hold.use-case';
import { IBookingRepository } from '@domain/scheduling/interfaces/repositories/booking.repository.interface';
import { IBookingHoldRepository } from '@domain/scheduling/interfaces/repositories/booking-hold.repository.interface';
import { MessageBus } from '@shared/messaging/message-bus';
import { DomainEvents } from '@shared/events/domain-events';
import { IClinicRepository } from '@domain/clinic/interfaces/repositories/clinic.repository.interface';
import { IClinicServiceTypeRepository } from '@domain/clinic/interfaces/repositories/clinic-service-type.repository.interface';
import { RolesEnum } from '@domain/auth/enums/roles.enum';
import { Clinic, ClinicServiceTypeDefinition } from '@domain/clinic/types/clinic.types';

const createInput = () => ({
  tenantId: 'tenant-1',
  clinicId: 'clinic-1',
  professionalId: 'prof-1',
  patientId: 'patient-1',
  serviceTypeId: 'service-1',
  startAtUtc: new Date('2025-10-10T10:00:00Z'),
  endAtUtc: new Date('2025-10-10T11:00:00Z'),
  requesterId: 'user-1',
  requesterRole: RolesEnum.PROFESSIONAL,
});

const buildClinic = (overrides: Partial<Clinic['holdSettings']> = {}): Clinic => ({
  id: 'clinic-1',
  tenantId: 'tenant-1',
  name: 'Clinica Teste',
  slug: 'clinica-teste',
  status: 'active',
  document: null,
  metadata: {},
  holdSettings: {
    ttlMinutes: 45,
    minAdvanceMinutes: 60,
    maxAdvanceMinutes: 4320,
    allowOverbooking: false,
    overbookingThreshold: 75,
    resourceMatchingStrict: true,
    ...overrides,
  },
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
});

const buildServiceType = (
  overrides: Partial<ClinicServiceTypeDefinition> = {},
): ClinicServiceTypeDefinition => ({
  id: 'service-1',
  clinicId: 'clinic-1',
  name: 'Sessao Individual',
  slug: 'sessao-individual',
  color: '#123456',
  durationMinutes: 60,
  price: 20000,
  currency: 'BRL',
  isActive: true,
  requiresAnamnesis: false,
  enableOnlineScheduling: true,
  minAdvanceMinutes: 45,
  maxAdvanceMinutes: 4320,
  cancellationPolicy: {
    type: 'percentage',
    windowMinutes: 120,
    percentage: 50,
  },
  eligibility: {
    allowNewPatients: true,
    allowExistingPatients: true,
  },
  instructions: null,
  requiredDocuments: [],
  customFields: [],
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  ...overrides,
});

describe('CreateHoldUseCase', () => {
  let bookingRepository: jest.Mocked<IBookingRepository>;
  let holdRepository: jest.Mocked<IBookingHoldRepository>;
  let messageBus: jest.Mocked<MessageBus>;
  let clinicRepository: jest.Mocked<IClinicRepository>;
  let clinicServiceTypeRepository: jest.Mocked<IClinicServiceTypeRepository>;
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

    clinicRepository = {
      findByTenant: jest.fn().mockResolvedValue(buildClinic()),
    } as unknown as jest.Mocked<IClinicRepository>;

    clinicServiceTypeRepository = {
      findById: jest.fn().mockResolvedValue(buildServiceType()),
    } as unknown as jest.Mocked<IClinicServiceTypeRepository>;

    useCase = new CreateHoldUseCase(
      holdRepository,
      bookingRepository,
      clinicRepository,
      clinicServiceTypeRepository,
      messageBus,
    );
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
      serviceTypeId: payload.serviceTypeId ?? null,
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
    expect(clinicServiceTypeRepository.findById).toHaveBeenCalledWith(
      input.clinicId,
      input.serviceTypeId,
    );
    expect(holdRepository.create.mock.calls[0][0].serviceTypeId).toBe(input.serviceTypeId);
    expect(holdRepository.create.mock.calls[0][0].ttlExpiresAtUtc).toEqual(
      new Date('2025-10-08T08:45:00.000Z'),
    );
    expect(messageBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: DomainEvents.SCHEDULING_HOLD_CREATED,
        aggregateId: 'hold-1',
      }),
    );
    const publishedEvent = messageBus.publish.mock.calls[0][0];
    expect(publishedEvent.payload.serviceTypeId).toBe(input.serviceTypeId);
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

  it('lan a erro quando antecedencia minima nao e respeitada', async () => {
    const input = {
      ...createInput(),
      startAtUtc: new Date('2025-10-08T08:30:00Z'),
      endAtUtc: new Date('2025-10-08T09:30:00Z'),
    };
    bookingRepository.listByProfessionalAndRange.mockResolvedValue([]);
    holdRepository.findActiveOverlap.mockResolvedValue([]);
    clinicServiceTypeRepository.findById.mockResolvedValue(
      buildServiceType({ minAdvanceMinutes: 90 }),
    );

    await expect(useCase.executeOrThrow(input)).rejects.toThrow('antecedencia minima');
  });

  it('lan a erro quando antecedencia maxima e excedida', async () => {
    const input = {
      ...createInput(),
      startAtUtc: new Date('2025-11-20T10:00:00Z'),
      endAtUtc: new Date('2025-11-20T11:00:00Z'),
    };
    bookingRepository.listByProfessionalAndRange.mockResolvedValue([]);
    holdRepository.findActiveOverlap.mockResolvedValue([]);
    clinicServiceTypeRepository.findById.mockResolvedValue(
      buildServiceType({ maxAdvanceMinutes: 60 * 24 * 10 }),
    );

    await expect(useCase.executeOrThrow(input)).rejects.toThrow(
      'Agendamento ultrapassa antecedencia maxima permitida',
    );
  });

  it('ajusta ttl para nao ultrapassar o horario de inicio', async () => {
    clinicRepository.findByTenant.mockResolvedValue(buildClinic({ ttlMinutes: 240 }));
    const input = {
      ...createInput(),
      startAtUtc: new Date('2025-10-08T09:30:00Z'),
      endAtUtc: new Date('2025-10-08T10:30:00Z'),
    };
    bookingRepository.listByProfessionalAndRange.mockResolvedValue([]);
    holdRepository.findActiveOverlap.mockResolvedValue([]);
    holdRepository.create.mockImplementation(async (payload) => ({
      id: 'hold-ttl',
      tenantId: payload.tenantId,
      clinicId: payload.clinicId,
      professionalId: payload.professionalId,
      patientId: payload.patientId,
      serviceTypeId: payload.serviceTypeId ?? null,
      startAtUtc: payload.startAtUtc,
      endAtUtc: payload.endAtUtc,
      ttlExpiresAtUtc: payload.ttlExpiresAtUtc,
      status: 'active',
      createdAt: new Date('2025-10-08T08:00:00Z'),
      updatedAt: new Date('2025-10-08T08:00:00Z'),
      version: 1,
    }));

    const hold = await useCase.executeOrThrow(input);

    expect(hold.ttlExpiresAtUtc).toEqual(new Date('2025-10-08T09:29:00.000Z'));
  });

  it('falha quando clinica nao encontrada', async () => {
    clinicRepository.findByTenant.mockResolvedValue(null);
    bookingRepository.listByProfessionalAndRange.mockResolvedValue([]);
    holdRepository.findActiveOverlap.mockResolvedValue([]);
    clinicServiceTypeRepository.findById.mockResolvedValue(buildServiceType());

    await expect(useCase.executeOrThrow(createInput())).rejects.toBeInstanceOf(NotFoundException);
  });

  it('bloqueia roles nao autorizados', async () => {
    const input = {
      ...createInput(),
      requesterRole: RolesEnum.PATIENT,
    };
    bookingRepository.listByProfessionalAndRange.mockResolvedValue([]);
    holdRepository.findActiveOverlap.mockResolvedValue([]);
    clinicServiceTypeRepository.findById.mockResolvedValue(buildServiceType());

    await expect(useCase.executeOrThrow(input)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('falha quando tipo de servico nao encontrado', async () => {
    clinicServiceTypeRepository.findById.mockResolvedValue(null);
    bookingRepository.listByProfessionalAndRange.mockResolvedValue([]);
    holdRepository.findActiveOverlap.mockResolvedValue([]);

    await expect(useCase.executeOrThrow(createInput())).rejects.toBeInstanceOf(NotFoundException);
  });

  it('falha quando tipo de servico esta inativo', async () => {
    clinicServiceTypeRepository.findById.mockResolvedValue(buildServiceType({ isActive: false }));
    bookingRepository.listByProfessionalAndRange.mockResolvedValue([]);
    holdRepository.findActiveOverlap.mockResolvedValue([]);

    await expect(useCase.executeOrThrow(createInput())).rejects.toBeInstanceOf(ForbiddenException);
  });
});
