import { ClinicGoogleCalendarSyncService } from '../../../src/modules/clinic/services/clinic-google-calendar-sync.service';
import { MessageBus } from '../../../src/shared/messaging/message-bus';
import { IClinicConfigurationRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-configuration.repository.interface';
import { IClinicRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic.repository.interface';
import { IExternalCalendarEventsRepository } from '../../../src/domain/scheduling/interfaces/repositories/external-calendar-events.repository.interface';
import { IGoogleCalendarService } from '../../../src/domain/integrations/interfaces/services/google-calendar.service.interface';
import { IPatientRepository } from '../../../src/domain/patients/interfaces/repositories/patient.repository.interface';
import {
  SchedulingBookingCancelledEvent,
  SchedulingBookingCreatedEvent,
} from '../../../src/modules/scheduling/services/scheduling-event.types';
import { DomainEvent } from '../../../src/shared/events/domain-event.interface';
import { DomainEvents } from '../../../src/shared/events/domain-events';

type Mocked<T> = jest.Mocked<T>;

const createDomainEvent = <TPayload>(
  eventName: string,
  aggregateId: string,
  payload: TPayload,
): DomainEvent<TPayload> => ({
  eventId: 'evt-1',
  eventName,
  aggregateId,
  occurredOn: new Date('2099-01-01T10:00:00Z'),
  metadata: {},
  payload,
});

describe('ClinicGoogleCalendarSyncService', () => {
  let messageBus: Mocked<MessageBus>;
  let configurationRepository: Mocked<IClinicConfigurationRepository>;
  let clinicRepository: Mocked<IClinicRepository>;
  let patientRepository: Mocked<IPatientRepository>;
  let externalEventsRepository: Mocked<IExternalCalendarEventsRepository>;
  let googleCalendarService: Mocked<IGoogleCalendarService>;
  let service: ClinicGoogleCalendarSyncService;

  const listeners = new Map<string, (event: unknown) => Promise<void>>();

  beforeEach(() => {
    listeners.clear();

    messageBus = {
      subscribe: jest.fn((eventName: string, listener: (event: unknown) => Promise<void>) => {
        listeners.set(eventName, listener);
      }),
      unsubscribe: jest.fn(),
      publish: jest.fn(),
    } as unknown as Mocked<MessageBus>;

    configurationRepository = {
      findLatestAppliedVersion: jest.fn(),
    } as unknown as Mocked<IClinicConfigurationRepository>;

    clinicRepository = {
      findById: jest.fn().mockResolvedValue(null),
    } as unknown as Mocked<IClinicRepository>;

    patientRepository = {
      findById: jest.fn().mockResolvedValue({
        fullName: 'Paciente Teste',
        shortName: 'Paciente',
      }),
    } as unknown as Mocked<IPatientRepository>;
    externalEventsRepository = {
      findByExternalId: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(),
      updateStatus: jest.fn(),
    } as unknown as Mocked<IExternalCalendarEventsRepository>;

    googleCalendarService = {
      upsertEvent: jest.fn().mockResolvedValue({ data: { externalEventId: 'google-event-1' } }),
      deleteEvent: jest.fn().mockResolvedValue({ data: undefined }),
    } as unknown as Mocked<IGoogleCalendarService>;

    service = new ClinicGoogleCalendarSyncService(
      messageBus,
      configurationRepository,
      clinicRepository,
      patientRepository,
      externalEventsRepository,
      googleCalendarService,
    );

    service.onModuleInit();
  });

  afterEach(() => {
    service.onModuleDestroy();
    jest.resetAllMocks();
  });

  const enabledSettings = {
    id: 'integration-version',
    clinicId: 'clinic-1',
    section: 'integrations',
    version: 1,
    payload: {
      integrationSettings: {
        googleCalendar: {
          enabled: true,
          syncMode: 'one_way',
          conflictPolicy: 'onterapi_wins',
          requireValidationForExternalEvents: false,
          defaultCalendarId: 'calendar-123',
          hidePatientName: false,
          prefix: 'Dr.',
        },
      },
    },
    createdBy: 'user-1',
    createdAt: new Date('2099-01-01T09:00:00Z'),
  } as any;

  const getListener = (eventName: string): ((event: unknown) => Promise<void>) => {
    const listener = listeners.get(eventName);
    if (!listener) {
      throw new Error(`Listener for ${eventName} not registered`);
    }
    return listener;
  };

  it('ignores sync when integration settings are unavailable', async () => {
    configurationRepository.findLatestAppliedVersion.mockResolvedValueOnce(null);

    const listener = getListener(DomainEvents.SCHEDULING_BOOKING_CREATED);
    await listener(
      createDomainEvent<SchedulingBookingCreatedEvent['payload']>(
        DomainEvents.SCHEDULING_BOOKING_CREATED,
        'booking-1',
        {
          bookingId: 'booking-1',
          tenantId: 'tenant-1',
          clinicId: 'clinic-1',
          professionalId: 'prof-1',
          patientId: 'patient-1',
          startAtUtc: new Date('2099-01-02T12:00:00Z'),
          endAtUtc: new Date('2099-01-02T13:00:00Z'),
          source: 'onterapi',
          timezone: 'America/Sao_Paulo',
          createdAt: new Date('2099-01-01T09:00:00Z'),
        },
      ),
    );

    expect(googleCalendarService.upsertEvent).not.toHaveBeenCalled();
    expect(externalEventsRepository.upsert).not.toHaveBeenCalled();
  });

  it('syncs booking creation with Google Calendar and stores external event', async () => {
    configurationRepository.findLatestAppliedVersion.mockResolvedValue(enabledSettings);

    const listener = getListener(DomainEvents.SCHEDULING_BOOKING_CREATED);
    await listener(
      createDomainEvent<SchedulingBookingCreatedEvent['payload']>(
        DomainEvents.SCHEDULING_BOOKING_CREATED,
        'booking-1',
        {
          bookingId: 'booking-1',
          tenantId: 'tenant-1',
          clinicId: 'clinic-1',
          professionalId: 'prof-1',
          patientId: 'patient-1',
          startAtUtc: new Date('2099-01-02T12:00:00Z'),
          endAtUtc: new Date('2099-01-02T13:00:00Z'),
          source: 'onterapi',
          timezone: 'America/Sao_Paulo',
          createdAt: new Date('2099-01-01T09:00:00Z'),
        },
      ),
    );

    expect(googleCalendarService.upsertEvent).toHaveBeenCalledTimes(1);
    const payload = googleCalendarService.upsertEvent.mock.calls[0][0];
    expect(payload.summary).toContain('Paciente Teste');
    expect(payload.calendarId).toBe('calendar-123');
    expect(externalEventsRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        externalId: 'google-event-1',
        status: 'approved',
      }),
    );
  });

  it('marks external event as pending when Google Calendar returns error', async () => {
    configurationRepository.findLatestAppliedVersion.mockResolvedValue(enabledSettings);
    googleCalendarService.upsertEvent.mockResolvedValueOnce({
      error: new Error('quota exceeded'),
    });

    const listener = getListener(DomainEvents.SCHEDULING_BOOKING_CREATED);
    await listener(
      createDomainEvent<SchedulingBookingCreatedEvent['payload']>(
        DomainEvents.SCHEDULING_BOOKING_CREATED,
        'booking-1',
        {
          bookingId: 'booking-1',
          tenantId: 'tenant-1',
          clinicId: 'clinic-1',
          professionalId: 'prof-1',
          patientId: 'patient-1',
          startAtUtc: new Date('2099-01-02T12:00:00Z'),
          endAtUtc: new Date('2099-01-02T13:00:00Z'),
          source: 'onterapi',
          timezone: 'America/Sao_Paulo',
          createdAt: new Date('2099-01-01T09:00:00Z'),
        },
      ),
    );

    expect(externalEventsRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'pending',
        validationErrors: ['quota exceeded'],
      }),
    );
  });

  it('deletes booking on Google Calendar when cancelled and updates status', async () => {
    configurationRepository.findLatestAppliedVersion.mockResolvedValue(enabledSettings);
    externalEventsRepository.findByExternalId.mockResolvedValueOnce({
      id: 'ext-1',
      tenantId: 'tenant-1',
      professionalId: 'prof-1',
      source: 'google_calendar',
      externalId: 'google-event-1',
      startAtUtc: new Date('2099-01-02T12:00:00Z'),
      endAtUtc: new Date('2099-01-02T13:00:00Z'),
      timezone: 'America/Sao_Paulo',
      status: 'approved',
      validationErrors: null,
      resourceId: 'calendar-123',
      createdAt: new Date('2099-01-01T09:00:00Z'),
      updatedAt: new Date('2099-01-01T09:00:00Z'),
    });

    const listener = getListener(DomainEvents.SCHEDULING_BOOKING_CANCELLED);
    await listener(
      createDomainEvent<SchedulingBookingCancelledEvent['payload']>(
        DomainEvents.SCHEDULING_BOOKING_CANCELLED,
        'booking-1',
        {
          bookingId: 'booking-1',
          tenantId: 'tenant-1',
          clinicId: 'clinic-1',
          professionalId: 'prof-1',
          patientId: 'patient-1',
          cancelledBy: 'user-1',
          reason: 'patient_request',
          cancelledAt: new Date('2099-01-02T15:00:00Z'),
        },
      ),
    );

    expect(googleCalendarService.deleteEvent).toHaveBeenCalledTimes(1);
    expect(externalEventsRepository.updateStatus).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'approved' }),
    );
  });
});
