import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import {
  IClinicConfigurationRepository,
  IClinicConfigurationRepository as IClinicConfigurationRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-configuration.repository.interface';
import {
  IClinicRepository,
  IClinicRepository as IClinicRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic.repository.interface';
import { Clinic } from '../../../domain/clinic/types/clinic.types';
import {
  IExternalCalendarEventsRepository,
  IExternalCalendarEventsRepositoryToken,
} from '../../../domain/scheduling/interfaces/repositories/external-calendar-events.repository.interface';
import {
  GoogleCalendarEventPayload,
  IGoogleCalendarService,
} from '../../../domain/integrations/interfaces/services/google-calendar.service.interface';
import {
  IPatientRepository,
  IPatientRepositoryToken,
} from '../../../domain/patients/interfaces/repositories/patient.repository.interface';
import {
  SchedulingBookingCancelledEvent,
  SchedulingBookingCreatedEvent,
  SchedulingBookingRescheduledEvent,
} from '../../scheduling/services/scheduling-event.types';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';

type GoogleCalendarIntegrationSettings = {
  enabled: boolean;
  syncMode: 'one_way' | 'two_way';
  conflictPolicy: 'onterapi_wins' | 'google_wins' | 'ask_user';
  requireValidationForExternalEvents: boolean;
  defaultCalendarId?: string;
  hidePatientName?: boolean;
  prefix?: string;
};

@Injectable()
export class ClinicGoogleCalendarSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ClinicGoogleCalendarSyncService.name);
  private readonly listeners = new Map<string, (event: unknown) => Promise<void>>();

  constructor(
    private readonly messageBus: MessageBus,
    @Inject(IClinicConfigurationRepositoryToken)
    private readonly clinicConfigurationRepository: IClinicConfigurationRepository,
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
    @Inject(IPatientRepositoryToken)
    private readonly patientRepository: IPatientRepository,
    @Inject(IExternalCalendarEventsRepositoryToken)
    private readonly externalCalendarEventsRepository: IExternalCalendarEventsRepository,
    @Inject(IGoogleCalendarService)
    private readonly googleCalendarService: IGoogleCalendarService,
  ) {}

  onModuleInit(): void {
    this.registerListener(
      DomainEvents.SCHEDULING_BOOKING_CREATED,
      async (event) => await this.handleBookingCreated(event as SchedulingBookingCreatedEvent),
    );

    this.registerListener(
      DomainEvents.SCHEDULING_BOOKING_RESCHEDULED,
      async (event) =>
        await this.handleBookingRescheduled(event as SchedulingBookingRescheduledEvent),
    );

    this.registerListener(
      DomainEvents.SCHEDULING_BOOKING_CANCELLED,
      async (event) => await this.handleBookingCancelled(event as SchedulingBookingCancelledEvent),
    );
  }

  onModuleDestroy(): void {
    for (const [eventName, listener] of this.listeners.entries()) {
      this.messageBus.unsubscribe(eventName, listener as unknown as (...args: unknown[]) => void);
      this.listeners.delete(eventName);
    }
  }

  private registerListener(eventName: string, listener: (event: unknown) => Promise<void>): void {
    this.listeners.set(eventName, listener);
    this.messageBus.subscribe(eventName, listener);
    this.logger.debug(`ClinicGoogleCalendarSyncService listening to ${eventName}`);
  }

  private async handleBookingCreated(event: SchedulingBookingCreatedEvent): Promise<void> {
    const { payload } = event;

    if (payload.source === 'google_calendar') {
      this.logger.debug('Skipping Google sync for booking created from google source', {
        bookingId: payload.bookingId,
      });
      return;
    }

    await this.syncBookingWithCalendar({
      tenantId: payload.tenantId,
      clinicId: payload.clinicId,
      professionalId: payload.professionalId,
      bookingId: payload.bookingId,
      patientId: payload.patientId,
      startAtUtc: payload.startAtUtc,
      endAtUtc: payload.endAtUtc,
      timezone: payload.timezone ?? 'UTC',
    });
  }

  private async handleBookingRescheduled(event: SchedulingBookingRescheduledEvent): Promise<void> {
    const { payload } = event;

    await this.syncBookingWithCalendar({
      tenantId: payload.tenantId,
      clinicId: payload.clinicId,
      professionalId: payload.professionalId,
      bookingId: payload.bookingId,
      patientId: payload.patientId,
      startAtUtc: payload.newStartAtUtc,
      endAtUtc: payload.newEndAtUtc,
      previousStartAtUtc: payload.previousStartAtUtc,
      previousEndAtUtc: payload.previousEndAtUtc,
    });
  }

  private async handleBookingCancelled(event: SchedulingBookingCancelledEvent): Promise<void> {
    const { payload } = event;

    await this.cancelBookingInCalendar({
      tenantId: payload.tenantId,
      clinicId: payload.clinicId,
      professionalId: payload.professionalId,
      bookingId: payload.bookingId,
    });
  }

  private async syncBookingWithCalendar(input: {
    tenantId: string;
    clinicId: string;
    professionalId: string;
    bookingId: string;
    patientId: string;
    startAtUtc: Date;
    endAtUtc: Date;
    timezone?: string;
    previousStartAtUtc?: Date;
    previousEndAtUtc?: Date;
  }): Promise<void> {
    const settings = await this.resolveGoogleSettings(input.clinicId);
    if (!settings || settings.enabled !== true) {
      return;
    }

    const clinic = await this.safeGetClinic(input.clinicId);
    const patientName = await this.resolvePatientName(
      clinic?.tenantId ?? input.tenantId,
      input.patientId,
      settings.hidePatientName,
    );

    const summary = this.buildSummary(settings, patientName);
    const description = this.buildDescription(settings, clinic);

    const existingExternal = await this.externalCalendarEventsRepository.findByExternalId(
      input.tenantId,
      input.professionalId,
      input.bookingId,
    );

    const timezone = input.timezone ?? existingExternal?.timezone ?? 'UTC';

    const payload: GoogleCalendarEventPayload = {
      tenantId: input.tenantId,
      clinicId: input.clinicId,
      professionalId: input.professionalId,
      bookingId: input.bookingId,
      calendarId: settings.defaultCalendarId,
      externalEventId: existingExternal?.externalId,
      startAtUtc: input.startAtUtc,
      endAtUtc: input.endAtUtc,
      timezone,
      summary,
      description,
      source: 'onterapi',
    };

    const result = await this.googleCalendarService.upsertEvent(payload);

    const externalId =
      result.data?.externalEventId ??
      existingExternal?.externalId ??
      payload.externalEventId ??
      input.bookingId;

    await this.externalCalendarEventsRepository.upsert({
      id: existingExternal?.id,
      tenantId: input.tenantId,
      professionalId: input.professionalId,
      source: 'google_calendar',
      externalId,
      startAtUtc: input.startAtUtc,
      endAtUtc: input.endAtUtc,
      timezone,
      status: result.error ? 'pending' : 'approved',
      validationErrors: result.error ? [result.error.message] : null,
      resourceId: settings.defaultCalendarId ?? null,
    });

    if (result.error) {
      this.logger.error('Failed to sync booking with Google Calendar', result.error, {
        bookingId: input.bookingId,
        professionalId: input.professionalId,
      });
    } else {
      this.logger.debug('Booking synced with Google Calendar', {
        bookingId: input.bookingId,
        externalEventId: externalId,
        professionalId: input.professionalId,
      });
    }
  }

  private async cancelBookingInCalendar(input: {
    tenantId: string;
    clinicId: string;
    professionalId: string;
    bookingId: string;
  }): Promise<void> {
    const settings = await this.resolveGoogleSettings(input.clinicId);
    if (!settings || settings.enabled !== true) {
      return;
    }

    const existingExternal = await this.externalCalendarEventsRepository.findByExternalId(
      input.tenantId,
      input.professionalId,
      input.bookingId,
    );

    const externalEventId = existingExternal?.externalId ?? input.bookingId;
    const deleteResult = await this.googleCalendarService.deleteEvent({
      tenantId: input.tenantId,
      clinicId: input.clinicId,
      professionalId: input.professionalId,
      calendarId: settings.defaultCalendarId,
      externalEventId,
    });

    if (existingExternal) {
      await this.externalCalendarEventsRepository.updateStatus({
        tenantId: input.tenantId,
        eventId: existingExternal.id,
        status: deleteResult.error ? 'pending' : 'approved',
        validationErrors: deleteResult.error ? [deleteResult.error.message] : null,
      });
    }

    if (deleteResult.error) {
      this.logger.error('Failed to delete Google Calendar event', deleteResult.error, {
        bookingId: input.bookingId,
        externalEventId,
      });
    } else {
      this.logger.debug('Booking removed from Google Calendar', {
        bookingId: input.bookingId,
        externalEventId,
      });
    }
  }

  private async resolveGoogleSettings(
    clinicId: string,
  ): Promise<GoogleCalendarIntegrationSettings | null> {
    try {
      const version = await this.clinicConfigurationRepository.findLatestAppliedVersion(
        clinicId,
        'integrations',
      );

      if (!version) {
        return null;
      }

      const payload = version.payload ?? {};
      const integrations =
        payload && typeof payload === 'object' && 'integrationSettings' in payload
          ? (payload as Record<string, unknown>).integrationSettings
          : payload;

      const googleSection =
        integrations && typeof integrations === 'object' && 'googleCalendar' in integrations
          ? (integrations as Record<string, unknown>).googleCalendar
          : undefined;

      if (!googleSection || typeof googleSection !== 'object') {
        return null;
      }

      const raw = googleSection as Record<string, unknown>;

      return {
        enabled: raw.enabled === true,
        syncMode:
          raw.syncMode === 'two_way'
            ? 'two_way'
            : raw.syncMode === 'one_way'
              ? 'one_way'
              : 'one_way',
        conflictPolicy:
          raw.conflictPolicy === 'google_wins'
            ? 'google_wins'
            : raw.conflictPolicy === 'ask_user'
              ? 'ask_user'
              : 'onterapi_wins',
        requireValidationForExternalEvents: raw.requireValidationForExternalEvents === true,
        defaultCalendarId:
          typeof raw.defaultCalendarId === 'string' ? raw.defaultCalendarId : undefined,
        hidePatientName: raw.hidePatientName === true,
        prefix: typeof raw.prefix === 'string' ? raw.prefix : undefined,
      };
    } catch (error) {
      this.logger.error('Failed to resolve Google Calendar settings', error as Error, {
        clinicId,
      });
      return null;
    }
  }

  private async resolvePatientName(
    tenantId: string,
    patientId: string,
    hidePatientName?: boolean,
  ): Promise<string> {
    if (hidePatientName) {
      return 'Consulta';
    }

    try {
      const patient = await this.patientRepository.findById(tenantId, patientId);
      if (patient?.fullName) {
        return patient.fullName;
      }
      if (patient?.shortName) {
        return patient.shortName;
      }
    } catch (error) {
      this.logger.warn('Could not resolve patient name for calendar sync', {
        tenantId,
        patientId,
        error: (error as Error).message,
      });
    }

    return 'Consulta';
  }
  private buildSummary(settings: GoogleCalendarIntegrationSettings, patientName: string): string {
    const base = settings.hidePatientName ? 'Consulta' : `Consulta - ${patientName}`;

    if (settings.prefix && settings.prefix.trim().length > 0) {
      return `${settings.prefix.trim()} ${base}`.trim();
    }

    return base;
  }

  private buildDescription(
    settings: GoogleCalendarIntegrationSettings,
    clinic: Clinic | null,
  ): string | undefined {
    const clinicName = clinic?.name ?? 'Onterapi';
    if (settings.hidePatientName) {
      return `Atendimento agendado pela ${clinicName}`;
    }

    return `Agendamento registrado pela ${clinicName}`;
  }

  private async safeGetClinic(clinicId: string): Promise<Clinic | null> {
    try {
      return await this.clinicRepository.findById(clinicId);
    } catch (error) {
      this.logger.warn('Failed to load clinic for calendar sync', {
        clinicId,
        error: (error as Error).message,
      });
      return null;
    }
  }
}
