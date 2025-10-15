import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  GoogleCalendarDeletePayload,
  GoogleCalendarEventPayload,
  GoogleCalendarSyncResult,
  IGoogleCalendarService,
} from '../../../domain/integrations/interfaces/services/google-calendar.service.interface';
import { Result } from '../../../shared/types/result.type';

@Injectable()
export class GoogleCalendarService implements IGoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);
  private readonly baseUrl?: string;
  private readonly apiKey?: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.normalizeUrl(
      this.configService.get<string>('GOOGLE_CALENDAR_API_BASE_URL'),
    );
    this.apiKey = this.configService.get<string>('GOOGLE_CALENDAR_API_KEY');
  }

  async upsertEvent(
    payload: GoogleCalendarEventPayload,
  ): Promise<Result<GoogleCalendarSyncResult>> {
    if (!this.baseUrl || !this.apiKey) {
      this.logger.warn('Google Calendar integration not configured. Skipping sync.', {
        hasBaseUrl: Boolean(this.baseUrl),
        hasApiKey: Boolean(this.apiKey),
        bookingId: payload.bookingId,
      });

      return { data: { externalEventId: payload.bookingId } };
    }

    try {
      const endpoint = payload.externalEventId
        ? `${this.baseUrl}/events/${encodeURIComponent(payload.externalEventId)}`
        : `${this.baseUrl}/events`;
      const response = await fetch(endpoint, {
        method: payload.externalEventId ? 'PATCH' : 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          calendarId: payload.calendarId,
          summary: payload.summary,
          description: payload.description,
          start: {
            dateTime: payload.startAtUtc.toISOString(),
            timeZone: payload.timezone,
          },
          end: {
            dateTime: payload.endAtUtc.toISOString(),
            timeZone: payload.timezone,
          },
          source: {
            title: 'Onterapi',
            id: payload.bookingId,
          },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        const error = new Error(
          `Google Calendar upsert failed with status ${response.status}: ${errorBody}`,
        );
        this.logger.error(error.message, error, {
          bookingId: payload.bookingId,
          professionalId: payload.professionalId,
        });
        return { error };
      }

      let externalEventId: string | undefined;
      try {
        const body = await response.json();
        externalEventId = typeof body?.id === 'string' ? body.id : undefined;
      } catch {
        externalEventId = undefined;
      }

      if (!externalEventId) {
        externalEventId = payload.bookingId;
      }

      this.logger.debug('Google Calendar event upserted', {
        bookingId: payload.bookingId,
        externalEventId,
        professionalId: payload.professionalId,
      });

      return { data: { externalEventId } };
    } catch (error) {
      this.logger.error('Unexpected error while upserting Google Calendar event', error as Error, {
        bookingId: payload.bookingId,
        professionalId: payload.professionalId,
      });
      return { error: error as Error };
    }
  }

  async deleteEvent(payload: GoogleCalendarDeletePayload): Promise<Result<void>> {
    if (!this.baseUrl || !this.apiKey) {
      this.logger.warn('Google Calendar integration not configured. Skipping delete.', {
        hasBaseUrl: Boolean(this.baseUrl),
        hasApiKey: Boolean(this.apiKey),
        externalEventId: payload.externalEventId,
      });

      return { data: undefined };
    }

    try {
      const endpoint = `${this.baseUrl}/events/${encodeURIComponent(payload.externalEventId)}`;
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          calendarId: payload.calendarId,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        const error = new Error(
          `Google Calendar delete failed with status ${response.status}: ${errorBody}`,
        );
        this.logger.error(error.message, error, {
          externalEventId: payload.externalEventId,
          professionalId: payload.professionalId,
        });
        return { error };
      }

      this.logger.debug('Google Calendar event deleted', {
        externalEventId: payload.externalEventId,
        professionalId: payload.professionalId,
      });

      return { data: undefined };
    } catch (error) {
      this.logger.error('Unexpected error while deleting Google Calendar event', error as Error, {
        externalEventId: payload.externalEventId,
        professionalId: payload.professionalId,
      });
      return { error: error as Error };
    }
  }

  private normalizeUrl(url?: string | null): string | undefined {
    if (!url) {
      return undefined;
    }

    return url.endsWith('/') ? url.slice(0, -1) : url;
  }
}
