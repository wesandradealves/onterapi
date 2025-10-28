import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateHoldUseCase } from '@modules/scheduling/use-cases/create-hold.use-case';
import { IBookingRepository } from '@domain/scheduling/interfaces/repositories/booking.repository.interface';
import { IBookingHoldRepository } from '@domain/scheduling/interfaces/repositories/booking-hold.repository.interface';
import { MessageBus } from '@shared/messaging/message-bus';
import { DomainEvents } from '@shared/events/domain-events';
import { IClinicRepository } from '@domain/clinic/interfaces/repositories/clinic.repository.interface';
import { IClinicServiceTypeRepository } from '@domain/clinic/interfaces/repositories/clinic-service-type.repository.interface';
import { IClinicProfessionalCoverageRepository } from '@domain/clinic/interfaces/repositories/clinic-professional-coverage.repository.interface';
import { RolesEnum } from '@domain/auth/enums/roles.enum';
import { Clinic, ClinicProfessionalCoverage, ClinicServiceTypeDefinition } from '@domain/clinic/types/clinic.types';
import { BookingValidationService } from '@domain/scheduling/services/booking-validation.service';

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
  let coverageRepository: jest.Mocked<IClinicProfessionalCoverageRepository>;
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
      listComplianceDocuments: jest.fn(),
    } as unknown as jest.Mocked<IClinicRepository>;

    clinicServiceTypeRepository = {
      findById: jest.fn().mockResolvedValue(buildServiceType()),
    } as unknown as jest.Mocked<IClinicServiceTypeRepository>;

    coverageRepository = {
      findActiveOverlapping: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<IClinicProfessionalCoverageRepository>;

    useCase = new CreateHoldUseCase(
      holdRepository,
      bookingRepository,
      clinicRepository,
      clinicServiceTypeRepository,
      coverageRepository,
      messageBus,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
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
    expect(coverageRepository.findActiveOverlapping).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: input.tenantId,
        clinicId: input.clinicId,
        professionalId: input.professionalId,
      }),
    );
    expect(holdRepository.create.mock.calls[0][0].serviceTypeId).toBe(input.serviceTypeId);
    expect(holdRepository.create.mock.calls[0][0].ttlExpiresAtUtc).toEqual(
      new Date('2025-10-08T08:45:00.000Z'),
    );
    expect(holdRepository.create.mock.calls[0][0].originalProfessionalId).toBeNull();
    expect(holdRepository.create.mock.calls[0][0].coverageId).toBeNull();
    expect(messageBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: DomainEvents.SCHEDULING_HOLD_CREATED,
        aggregateId: 'hold-1',
      }),
    );
    const publishedEvent = messageBus.publish.mock.calls[0][0];
    expect(publishedEvent.payload.serviceTypeId).toBe(input.serviceTypeId);
    expect(publishedEvent.payload.originalProfessionalId).toBeUndefined();
    expect(hold.status).toBe('active');
  });

  it('applies coverage professional when active coverage overlaps', async () => {
    const input = createInput();
    const coverage: ClinicProfessionalCoverage = {
      id: 'coverage-1',
      tenantId: input.tenantId,
      clinicId: input.clinicId,
      professionalId: input.professionalId,
      coverageProfessionalId: 'prof-cover',
      startAt: new Date('2025-10-09T00:00:00Z'),
      endAt: new Date('2025-10-11T00:00:00Z'),
      status: 'active',
      reason: 'Ferias',
      notes: 'Substituicao integral',
      createdBy: 'manager-1',
      createdAt: new Date('2025-09-20T10:00:00Z'),
      updatedBy: 'manager-1',
      updatedAt: new Date('2025-09-20T10:00:00Z'),
      metadata: {},
    };

    coverageRepository.findActiveOverlapping.mockResolvedValue([coverage]);
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

    expect(hold.professionalId).toBe('prof-cover');
    expect(bookingRepository.listByProfessionalAndRange).toHaveBeenCalledWith(
      input.tenantId,
      'prof-cover',
      input.startAtUtc,
      input.endAtUtc,
    );
    expect(holdRepository.findActiveOverlap).toHaveBeenCalledWith(
      input.tenantId,
      'prof-cover',
      input.startAtUtc,
      input.endAtUtc,
    );
    expect(holdRepository.create.mock.calls[0][0].originalProfessionalId).toBe(input.professionalId);
    expect(holdRepository.create.mock.calls[0][0].coverageId).toBe(coverage.id);
    const publishedEvent = messageBus.publish.mock.calls[0][0];
    expect(publishedEvent.payload.professionalId).toBe('prof-cover');
    expect(publishedEvent.payload.originalProfessionalId).toBe(input.professionalId);
    expect(publishedEvent.payload.coverageId).toBe(coverage.id);
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

  it('falha quando horario final e anterior ao inicial', async () => {
    const input = {
      ...createInput(),
      endAtUtc: new Date('2025-10-10T09:00:00Z'),
    };

    await expect(useCase.executeOrThrow(input)).rejects.toThrow('Horario final deve ser posterior');
  });

  it('falha quando tentativa de criar hold no passado', async () => {
    const input = {
      ...createInput(),
      startAtUtc: new Date('2025-10-08T07:59:00Z'),
      endAtUtc: new Date('2025-10-08T09:00:00Z'),
    };

    await expect(useCase.executeOrThrow(input)).rejects.toThrow(
      'Nao e possivel criar holds no passado',
    );
  });

  it('lança conflito quando existe booking ativo no periodo', async () => {
    bookingRepository.listByProfessionalAndRange.mockResolvedValue([
      {
        id: 'booking-1',
        tenantId: 'tenant-1',
        professionalId: 'prof-1',
        clinicId: 'clinic-1',
        patientId: 'patient-9',
        startAtUtc: new Date('2025-10-10T09:30:00Z'),
        endAtUtc: new Date('2025-10-10T10:30:00Z'),
        status: 'confirmed',
      } as any,
    ]);
    holdRepository.findActiveOverlap.mockResolvedValue([]);

    await expect(useCase.executeOrThrow(createInput())).rejects.toThrow(
      'Profissional ja possui compromisso no periodo',
    );
  });

  it('computeHoldTtl nao retorna anterior ao tempo atual', () => {
    const now = new Date('2025-10-08T08:00:00Z');
    const start = new Date('2025-10-08T08:01:00Z');
    const ttlMinutes = 0; // forca expiracao imediata

    const result = (useCase as any).computeHoldTtl(start, now, ttlMinutes);

    expect(result.getTime()).toBeGreaterThanOrEqual(now.getTime());
  });

  it('resolveHoldSettings aplica fallback quando clinica nao possui configuracoes', () => {
    const resolved = (useCase as any).resolveHoldSettings(undefined);

    expect(resolved.ttlMinutes).toBe(30);
    expect(resolved.minAdvanceMinutes).toBe(60);
    expect(resolved.maxAdvanceMinutes).toBeUndefined();
    expect(resolved.maxAdvanceDays).toBe(90);
    expect(resolved.bufferBetweenBookingsMinutes).toBe(15);
  });

  it('resolveHoldSettings normaliza maxAdvanceMinutes positivos', () => {
    const resolved = (useCase as any).resolveHoldSettings({
      ttlMinutes: 20,
      minAdvanceMinutes: 15,
      maxAdvanceMinutes: 180,
      allowOverbooking: false,
      resourceMatchingStrict: true,
    });

    expect(resolved.ttlMinutes).toBe(20);
    expect(resolved.minAdvanceMinutes).toBe(15);
    expect(resolved.maxAdvanceMinutes).toBe(180);
    expect(resolved.maxAdvanceDays).toBe(1);
  });

  it('resolveHoldSettings trata maxAdvanceMinutes igual a zero', () => {
    const resolved = (useCase as any).resolveHoldSettings({
      ttlMinutes: 10,
      minAdvanceMinutes: 5,
      maxAdvanceMinutes: 0,
      allowOverbooking: false,
      resourceMatchingStrict: true,
    });

    expect(resolved.maxAdvanceMinutes).toBe(0);
    expect(resolved.maxAdvanceDays).toBe(90);
  });

  it('resolveHoldSettings usa fallback de 90 dias quando limite indefinido', () => {
    const resolved = (useCase as any).resolveHoldSettings({
      ttlMinutes: 20,
      minAdvanceMinutes: 10,
      allowOverbooking: false,
      resourceMatchingStrict: true,
    });

    expect(resolved.maxAdvanceMinutes).toBeUndefined();
    expect(resolved.maxAdvanceDays).toBe(90);
  });

  it('resolveHoldSettings define minAdvance zero quando nao informado', () => {
    const resolved = (useCase as any).resolveHoldSettings({
      ttlMinutes: 15,
      allowOverbooking: false,
      resourceMatchingStrict: true,
    });

    expect(resolved.minAdvanceMinutes).toBe(0);
  });

  it('resolveHoldSettings normaliza minAdvance quando definido como undefined', () => {
    const resolved = (useCase as any).resolveHoldSettings({
      ttlMinutes: 20,
      minAdvanceMinutes: undefined,
      allowOverbooking: false,
      resourceMatchingStrict: true,
    });

    expect(resolved.minAdvanceMinutes).toBe(0);
  });

  it('resolveHoldSettings preserva limite positivo configurado', () => {
    const resolved = (useCase as any).resolveHoldSettings({
      ttlMinutes: 25,
      minAdvanceMinutes: 15,
      maxAdvanceMinutes: 720,
      allowOverbooking: false,
      resourceMatchingStrict: true,
    });

    expect(resolved.maxAdvanceMinutes).toBe(720);
    expect(resolved.maxAdvanceDays).toBe(Math.max(1, Math.ceil(720 / (60 * 24))));
  });

  it('resolveHoldSettings considera maxAdvance zero como sem limite efetivo', () => {
    const resolved = (useCase as any).resolveHoldSettings({
      ttlMinutes: 15,
      minAdvanceMinutes: 5,
      maxAdvanceMinutes: 0,
      allowOverbooking: false,
      resourceMatchingStrict: true,
    });

    expect(resolved.maxAdvanceMinutes).toBe(0);
    expect(resolved.maxAdvanceDays).toBe(90);
  });

  it('resolveHoldSettings aplica ttl fallback quando indefinido', () => {
    const resolved = (useCase as any).resolveHoldSettings({
      minAdvanceMinutes: 5,
      maxAdvanceMinutes: 120,
      allowOverbooking: false,
      resourceMatchingStrict: true,
    });

    expect(resolved.ttlMinutes).toBe(30);
  });

  it('computeHoldTtl mantem valor quando ttl nao ultrapassa limites', () => {
    const now = new Date('2025-10-08T08:00:00Z');
    const start = new Date('2025-10-08T10:30:00Z');

    const result = (useCase as any).computeHoldTtl(start, now, 45);

    expect(result.toISOString()).toBe(new Date('2025-10-08T08:45:00Z').toISOString());
  });

  it('propaga erro de validacao do BookingValidationService', async () => {
    jest
      .spyOn(BookingValidationService, 'validateAdvanceWindow')
      .mockReturnValue({ success: false, error: new Error('window-error') } as any);

    bookingRepository.listByProfessionalAndRange.mockResolvedValue([]);
    holdRepository.findActiveOverlap.mockResolvedValue([]);

    await expect(useCase.executeOrThrow(createInput())).rejects.toThrow('window-error');
  });

  it('usa minAdvance da clinica quando servico nao define valor', async () => {
    const input = createInput();
    const clinic = buildClinic({ minAdvanceMinutes: 30 });
    clinicRepository.findByTenant.mockResolvedValue(clinic);
    const serviceType = buildServiceType();
    delete (serviceType as any).minAdvanceMinutes;
    clinicServiceTypeRepository.findById.mockResolvedValue(serviceType as any);
    bookingRepository.listByProfessionalAndRange.mockResolvedValue([]);
    holdRepository.findActiveOverlap.mockResolvedValue([]);
    holdRepository.create.mockImplementation(async (payload) => ({
      id: 'hold-min',
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

    let receivedMinAdvance = 0;
    jest.spyOn(BookingValidationService, 'validateAdvanceWindow').mockImplementation((payload) => {
      receivedMinAdvance = payload.availability.minAdvanceMinutes;
      return { success: true } as any;
    });

    await useCase.executeOrThrow(input);

    expect(receivedMinAdvance).toBe(30);
  });

  it('respeita limite de maxAdvance da clinica quando servico nao define', async () => {
    const input = {
      ...createInput(),
      startAtUtc: new Date('2025-10-08T12:45:00Z'),
      endAtUtc: new Date('2025-10-08T13:45:00Z'),
    };
    const clinic = buildClinic({ maxAdvanceMinutes: 180 });
    clinicRepository.findByTenant.mockResolvedValue(clinic);
    const serviceType = buildServiceType();
    delete (serviceType as any).maxAdvanceMinutes;
    clinicServiceTypeRepository.findById.mockResolvedValue(serviceType as any);
    bookingRepository.listByProfessionalAndRange.mockResolvedValue([]);
    holdRepository.findActiveOverlap.mockResolvedValue([]);

    await expect(useCase.executeOrThrow(input)).rejects.toThrow(
      'Antecedencia maxima para criacao de holds excedida',
    );
  });

  it('bloqueia criacao quando maxAdvance da clinica eh zero', async () => {
    const input = createInput();
    const clinic = buildClinic({ maxAdvanceMinutes: 0 });
    clinicRepository.findByTenant.mockResolvedValue(clinic);
    const serviceType = buildServiceType();
    delete (serviceType as any).maxAdvanceMinutes;
    clinicServiceTypeRepository.findById.mockResolvedValue(serviceType as any);
    bookingRepository.listByProfessionalAndRange.mockResolvedValue([]);
    holdRepository.findActiveOverlap.mockResolvedValue([]);

    await expect(useCase.executeOrThrow(input)).rejects.toThrow(
      'Antecedencia maxima para criacao de holds excedida',
    );
  });

  it('usa limite de maxAdvance da clinica quando servico nao define', async () => {
    const input = {
      ...createInput(),
      startAtUtc: new Date('2025-10-08T10:30:00Z'),
      endAtUtc: new Date('2025-10-08T11:30:00Z'),
    };
    const clinic = buildClinic({ maxAdvanceMinutes: 720 });
    clinicRepository.findByTenant.mockResolvedValue(clinic);
    const serviceType = buildServiceType();
    delete (serviceType as any).maxAdvanceMinutes;
    clinicServiceTypeRepository.findById.mockResolvedValue(serviceType as any);
    bookingRepository.listByProfessionalAndRange.mockResolvedValue([]);
    holdRepository.findActiveOverlap.mockResolvedValue([]);
    holdRepository.create.mockImplementation(async (payload) => ({
      id: 'hold-max',
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

    await expect(useCase.executeOrThrow(input)).resolves.not.toThrow();
  });

  it('permite criacao quando nao existe limite maximo configurado', async () => {
    const input = {
      ...createInput(),
      startAtUtc: new Date('2025-10-08T10:15:00Z'),
      endAtUtc: new Date('2025-10-08T11:15:00Z'),
    };
    const clinic = buildClinic();
    delete (clinic.holdSettings as any).maxAdvanceMinutes;
    clinicRepository.findByTenant.mockResolvedValue(clinic);
    const serviceType = buildServiceType();
    delete (serviceType as any).maxAdvanceMinutes;
    clinicServiceTypeRepository.findById.mockResolvedValue(serviceType as any);
    bookingRepository.listByProfessionalAndRange.mockResolvedValue([]);
    holdRepository.findActiveOverlap.mockResolvedValue([]);
    holdRepository.create.mockImplementation(async (payload) => ({
      id: 'hold-no-max',
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

    let receivedMaxDays = 0;
    jest.spyOn(BookingValidationService, 'validateAdvanceWindow').mockImplementation((payload) => {
      receivedMaxDays = payload.availability.maxAdvanceDays;
      return { success: true } as any;
    });

    await useCase.executeOrThrow(input);

    expect(receivedMaxDays).toBeGreaterThanOrEqual(90);
  });

  it('normaliza ttl minimo para 1 minuto quando configurado como zero', async () => {
    const input = createInput();
    const clinic = buildClinic({ ttlMinutes: 0 });
    clinicRepository.findByTenant.mockResolvedValue(clinic);
    bookingRepository.listByProfessionalAndRange.mockResolvedValue([]);
    holdRepository.findActiveOverlap.mockResolvedValue([]);
    holdRepository.create.mockImplementation(async (payload) => ({
      id: 'hold-ttl-min',
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

    expect(hold.ttlExpiresAtUtc.getTime()).toBeGreaterThanOrEqual(
      new Date('2025-10-08T08:00:00Z').getTime(),
    );
  });

  it('resolveHoldSettings usa fallback de 90 dias quando limite indefinido', () => {
    const resolved = (useCase as any).resolveHoldSettings({
      ttlMinutes: 20,
      minAdvanceMinutes: 10,
      allowOverbooking: false,
      resourceMatchingStrict: true,
    });

    expect(resolved.maxAdvanceMinutes).toBeUndefined();
    expect(resolved.maxAdvanceDays).toBe(90);
  });

  it('computeHoldTtl mantem valor quando ttl nao ultrapassa limites', () => {
    const now = new Date('2025-10-08T08:00:00Z');
    const start = new Date('2025-10-08T10:30:00Z');

    const result = (useCase as any).computeHoldTtl(start, now, 45);

    expect(result.toISOString()).toBe(new Date('2025-10-08T08:45:00Z').toISOString());
  });

  it('mantem TTL calculado quando janela permite', async () => {
    const input = {
      ...createInput(),
      startAtUtc: new Date('2025-10-08T09:30:00Z'),
      endAtUtc: new Date('2025-10-08T10:30:00Z'),
    };
    const clinic = buildClinic({ ttlMinutes: 15 });
    clinicRepository.findByTenant.mockResolvedValue(clinic);
    bookingRepository.listByProfessionalAndRange.mockResolvedValue([]);
    holdRepository.findActiveOverlap.mockResolvedValue([]);

    holdRepository.create.mockImplementation(async (payload) => ({
      id: 'hold-ttl-ok',
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

    await useCase.executeOrThrow(input);
  });

  it('computeHoldTtl limita expiração para antes do horario inicial', () => {
    const now = new Date('2025-10-08T08:00:00Z');
    const start = new Date('2025-10-08T08:45:00Z');

    const ttlMinutes = 180;
    const result = (useCase as any).computeHoldTtl(start, now, ttlMinutes);

    expect(result.getTime()).toBe(new Date('2025-10-08T08:44:00Z').getTime());
  });

  it('ajusta TTL para nao retornar antes do presente quando start proximo', async () => {
    const input = {
      ...createInput(),
      startAtUtc: new Date('2025-10-08T08:00:30Z'),
      endAtUtc: new Date('2025-10-08T09:00:00Z'),
    };
    const clinic = buildClinic({ ttlMinutes: 180, minAdvanceMinutes: 0 });
    clinicRepository.findByTenant.mockResolvedValue(clinic);
    clinicServiceTypeRepository.findById.mockResolvedValue(
      buildServiceType({ minAdvanceMinutes: 0 }),
    );
    bookingRepository.listByProfessionalAndRange.mockResolvedValue([]);
    holdRepository.findActiveOverlap.mockResolvedValue([]);

    holdRepository.create.mockImplementation(async (payload) => ({
      id: 'hold-ttl-adjusted',
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

    await useCase.executeOrThrow(input);

    const ttlCall = holdRepository.create.mock.calls.pop()?.[0];
    expect(ttlCall!.ttlExpiresAtUtc.getTime()).toBe(new Date('2025-10-08T08:00:00Z').getTime());
  });
});
