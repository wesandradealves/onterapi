import { ProcessClinicExternalCalendarEventUseCase } from '../../../src/modules/clinic/use-cases/process-clinic-external-calendar-event.use-case';
import { IExternalCalendarEventsRepository } from '../../../src/domain/scheduling/interfaces/repositories/external-calendar-events.repository.interface';
import { IClinicHoldRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-hold.repository.interface';
import { IClinicAppointmentRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-appointment.repository.interface';
import { IClinicRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic.repository.interface';
import { IClinicConfigurationRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-configuration.repository.interface';
import { ClinicAuditService } from '../../../src/infrastructure/clinic/services/clinic-audit.service';
import { ProcessClinicExternalCalendarEventInput } from '../../../src/domain/clinic/types/clinic.types';

type Mocked<T> = jest.Mocked<T>;

describe('ProcessClinicExternalCalendarEventUseCase', () => {
  let externalEventsRepository: Mocked<IExternalCalendarEventsRepository>;
  let clinicHoldRepository: Mocked<IClinicHoldRepository>;
  let clinicAppointmentRepository: Mocked<IClinicAppointmentRepository>;
  let clinicRepository: Mocked<IClinicRepository>;
  let clinicConfigurationRepository: Mocked<IClinicConfigurationRepository>;
  let auditService: Mocked<ClinicAuditService>;
  let useCase: ProcessClinicExternalCalendarEventUseCase;

  const baseInput: ProcessClinicExternalCalendarEventInput = {
    tenantId: 'tenant-1',
    clinicId: 'clinic-1',
    professionalId: 'prof-1',
    triggeredBy: 'google-sync',
    payload: {
      externalEventId: 'google-event-1',
      status: 'confirmed',
      startAt: new Date('2099-01-01T10:00:00Z'),
      endAt: new Date('2099-01-01T11:00:00Z'),
      timezone: 'America/Sao_Paulo',
    },
  };

  beforeEach(() => {
    externalEventsRepository = {
      findByExternalId: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockImplementation(async (payload) => ({
        id: payload.id ?? 'evt-1',
        tenantId: payload.tenantId,
        professionalId: payload.professionalId,
        source: 'google_calendar',
        externalId: payload.externalId,
        startAtUtc: payload.startAtUtc,
        endAtUtc: payload.endAtUtc,
        timezone: payload.timezone,
        status: payload.status,
        validationErrors: payload.validationErrors ?? null,
        resourceId: payload.resourceId ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      findApprovedOverlap: jest.fn().mockResolvedValue([]),
    } as unknown as Mocked<IExternalCalendarEventsRepository>;

    clinicHoldRepository = {
      findActiveOverlapByProfessional: jest.fn().mockResolvedValue([]),
      findActiveOverlapByResources: jest.fn().mockResolvedValue([]),
    } as unknown as Mocked<IClinicHoldRepository>;

    clinicAppointmentRepository = {
      findActiveOverlap: jest.fn().mockResolvedValue([]),
    } as unknown as Mocked<IClinicAppointmentRepository>;

    clinicRepository = {
      findByTenant: jest.fn().mockResolvedValue({
        id: 'clinic-1',
        tenantId: baseInput.tenantId,
        holdSettings: {
          ttlMinutes: 30,
          minAdvanceMinutes: 60,
          allowOverbooking: false,
          resourceMatchingStrict: true,
        },
      }),
      listComplianceDocuments: jest.fn(),
    } as unknown as Mocked<IClinicRepository>;

    clinicConfigurationRepository = {
      findLatestAppliedVersion: jest.fn().mockResolvedValue({
        payload: {
          integrationSettings: {
            googleCalendar: {
              enabled: true,
              syncMode: 'two_way',
              conflictPolicy: 'onterapi_wins',
              requireValidationForExternalEvents: false,
              defaultCalendarId: 'calendar-1',
              hidePatientName: false,
              prefix: 'Dr.',
            },
          },
        },
      }),
    } as unknown as Mocked<IClinicConfigurationRepository>;

    auditService = {
      register: jest.fn().mockResolvedValue(undefined),
    } as unknown as Mocked<ClinicAuditService>;

    useCase = new ProcessClinicExternalCalendarEventUseCase(
      externalEventsRepository,
      clinicHoldRepository,
      clinicAppointmentRepository,
      clinicRepository,
      clinicConfigurationRepository,
      auditService,
    );
  });

  it('aprova automaticamente evento confirmado quando integracao permite e nao ha conflitos', async () => {
    const result = await useCase.executeOrThrow(baseInput);

    expect(result.status).toBe('approved');
    expect(externalEventsRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'approved',
        validationErrors: null,
      }),
    );
    expect(auditService.register).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'clinic.google_calendar.event_processed',
        clinicId: baseInput.clinicId,
      }),
    );
  });

  it('mantem evento pendente quando configuracao exige validacao manual', async () => {
    clinicConfigurationRepository.findLatestAppliedVersion.mockResolvedValueOnce({
      payload: {
        integrationSettings: {
          googleCalendar: {
            enabled: true,
            syncMode: 'two_way',
            conflictPolicy: 'onterapi_wins',
            requireValidationForExternalEvents: true,
          },
        },
      },
    } as any);

    const result = await useCase.executeOrThrow(baseInput);

    expect(result.status).toBe('pending');
    expect(result.validationErrors).toBeNull();
  });

  it('marca conflito quando existe hold sobreposto', async () => {
    clinicHoldRepository.findActiveOverlapByProfessional.mockResolvedValueOnce([
      {
        id: 'hold-1',
      },
    ] as any);

    const result = await useCase.executeOrThrow(baseInput);

    expect(result.status).toBe('pending');
    expect(result.validationErrors).toEqual(expect.arrayContaining(['hold_conflict']));
  });

  it('mantem evento pendente quando integracao não está configurada', async () => {
    clinicConfigurationRepository.findLatestAppliedVersion.mockResolvedValueOnce(null);

    const result = await useCase.executeOrThrow(baseInput);

    expect(result.status).toBe('pending');
    expect(result.validationErrors).toEqual(expect.arrayContaining(['integration_not_configured']));
  });

  it('inclui conflito quando status é tentativo', async () => {
    const input: ProcessClinicExternalCalendarEventInput = {
      ...baseInput,
      payload: {
        ...baseInput.payload,
        status: 'tentative',
      },
    };

    const result = await useCase.executeOrThrow(input);

    expect(result.status).toBe('pending');
    expect(result.validationErrors).toEqual(expect.arrayContaining(['status_tentative']));
  });

  it('identifica conflito de recurso físico', async () => {
    clinicHoldRepository.findActiveOverlapByResources.mockResolvedValueOnce([
      { id: 'hold-2' } as any,
    ]);

    const input: ProcessClinicExternalCalendarEventInput = {
      ...baseInput,
      payload: {
        ...baseInput.payload,
        resources: ['lab-1'],
      },
    };

    const result = await useCase.executeOrThrow(input);

    expect(result.validationErrors).toEqual(expect.arrayContaining(['resource_conflict']));
  });

  it('marca evento no passado como conflictivo', async () => {
    const pastStart = new Date(Date.now() - 60_000);
    const pastEnd = new Date(Date.now() - 30_000);

    const input: ProcessClinicExternalCalendarEventInput = {
      ...baseInput,
      payload: {
        ...baseInput.payload,
        startAt: pastStart,
        endAt: pastEnd,
      },
    };

    const result = await useCase.executeOrThrow(input);

    expect(result.validationErrors).toEqual(expect.arrayContaining(['event_in_past']));
  });

  it('registra evento cancelado com status cancelado', async () => {
    const cancelledInput: ProcessClinicExternalCalendarEventInput = {
      ...baseInput,
      payload: {
        ...baseInput.payload,
        status: 'cancelled',
      },
    };

    externalEventsRepository.upsert.mockResolvedValueOnce({
      id: 'evt-1',
      tenantId: baseInput.tenantId,
      professionalId: baseInput.professionalId,
      source: 'google_calendar',
      externalId: baseInput.payload.externalEventId,
      startAtUtc: baseInput.payload.startAt,
      endAtUtc: baseInput.payload.endAt,
      timezone: baseInput.payload.timezone,
      status: 'cancelled',
      validationErrors: null,
      resourceId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await useCase.executeOrThrow(cancelledInput);

    expect(result.status).toBe('cancelled');
  });
});
