import type { Result } from '../../../../shared/types/result.type';

export interface GoogleCalendarEventPayload {
  tenantId: string;
  clinicId: string;
  professionalId: string;
  bookingId: string;
  calendarId: string | undefined;
  externalEventId?: string;
  startAtUtc: Date;
  endAtUtc: Date;
  timezone: string;
  summary: string;
  description?: string;
  source: 'onterapi';
}

export interface GoogleCalendarSyncResult {
  externalEventId: string;
}

export interface GoogleCalendarDeletePayload {
  tenantId: string;
  clinicId: string;
  professionalId: string;
  calendarId: string | undefined;
  externalEventId: string;
}

export interface IGoogleCalendarService {
  upsertEvent(payload: GoogleCalendarEventPayload): Promise<Result<GoogleCalendarSyncResult>>;
  deleteEvent(payload: GoogleCalendarDeletePayload): Promise<Result<void>>;
}

export const IGoogleCalendarService = Symbol('IGoogleCalendarService');
