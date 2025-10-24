import { ClinicPresenter } from '../../../src/modules/clinic/api/presenters/clinic.presenter';
import { ExternalCalendarEvent } from '../../../src/domain/scheduling/types/scheduling.types';

describe('ClinicPresenter.externalCalendarEvent', () => {
  it('mapeia campos do evento externo', () => {
    const event: ExternalCalendarEvent = {
      id: 'evt-1',
      tenantId: 'tenant-1',
      professionalId: 'prof-1',
      source: 'google_calendar',
      externalId: 'google-evt-123',
      startAtUtc: new Date('2025-10-10T10:00:00Z'),
      endAtUtc: new Date('2025-10-10T11:00:00Z'),
      timezone: 'America/Sao_Paulo',
      status: 'approved',
      validationErrors: ['buffer_violation'],
      resourceId: 'calendar-abc',
      createdAt: new Date('2025-10-08T09:00:00Z'),
      updatedAt: new Date('2025-10-08T09:30:00Z'),
    };

    const dto = ClinicPresenter.externalCalendarEvent(event);

    expect(dto).toMatchObject({
      id: 'evt-1',
      professionalId: 'prof-1',
      externalEventId: 'google-evt-123',
      status: 'approved',
      startAt: event.startAtUtc,
      endAt: event.endAtUtc,
      timezone: 'America/Sao_Paulo',
      validationErrors: ['buffer_violation'],
      calendarId: 'calendar-abc',
      source: 'google_calendar',
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    });
  });

  it('normaliza campos nulos', () => {
    const event: ExternalCalendarEvent = {
      id: 'evt-2',
      tenantId: 'tenant-1',
      professionalId: 'prof-1',
      source: 'google_calendar',
      externalId: 'google-evt-null',
      startAtUtc: new Date('2025-10-11T10:00:00Z'),
      endAtUtc: new Date('2025-10-11T11:00:00Z'),
      timezone: 'UTC',
      status: 'pending',
      validationErrors: null,
      resourceId: null,
      createdAt: new Date('2025-10-09T09:00:00Z'),
      updatedAt: new Date('2025-10-09T09:30:00Z'),
    };

    const dto = ClinicPresenter.externalCalendarEvent(event);

    expect(dto.validationErrors).toBeNull();
    expect(dto.calendarId).toBeNull();
  });
});
