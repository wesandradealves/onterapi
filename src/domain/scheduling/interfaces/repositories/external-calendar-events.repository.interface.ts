import { ExternalCalendarEvent, ExternalCalendarEventStatus } from '../../types/scheduling.types';

export interface UpsertExternalCalendarEventInput
  extends Omit<ExternalCalendarEvent, 'id' | 'createdAt' | 'updatedAt'> {
  id?: string;
}

export interface UpdateExternalCalendarEventStatusInput {
  tenantId: string;
  eventId: string;
  status: ExternalCalendarEventStatus;
  validationErrors?: string[] | null;
}

export interface IExternalCalendarEventsRepository {
  upsert(data: UpsertExternalCalendarEventInput): Promise<ExternalCalendarEvent>;
  findByExternalId(
    tenantId: string,
    professionalId: string,
    externalId: string,
  ): Promise<ExternalCalendarEvent | null>;
  listPendingByProfessional(
    tenantId: string,
    professionalId: string,
  ): Promise<ExternalCalendarEvent[]>;
  updateStatus(data: UpdateExternalCalendarEventStatusInput): Promise<ExternalCalendarEvent>;
}

export const IExternalCalendarEventsRepositoryToken = Symbol('IExternalCalendarEventsRepository');
