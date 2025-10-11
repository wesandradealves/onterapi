import { RecurrenceOccurrence, RecurrenceSeries } from '../../types/scheduling.types';

export interface CreateRecurrenceSeriesInput
  extends Omit<RecurrenceSeries, 'id' | 'createdAt' | 'updatedAt'> {}

export interface UpdateRecurrenceSeriesLimitsInput {
  tenantId: string;
  seriesId: string;
  maxReschedulesPerOccurrence: number;
  maxReschedulesPerSeries: number;
}

export interface CreateRecurrenceOccurrenceInput
  extends Omit<RecurrenceOccurrence, 'id' | 'createdAt' | 'updatedAt' | 'reschedulesCount'> {}

export interface RecordOccurrenceRescheduleInput {
  tenantId: string;
  occurrenceId: string;
  incrementBy: number;
}

export interface RescheduleUsage {
  occurrenceReschedules: number;
  seriesReschedules: number;
}

export interface IRecurrenceRepository {
  createSeries(data: CreateRecurrenceSeriesInput): Promise<RecurrenceSeries>;
  updateSeriesLimits(data: UpdateRecurrenceSeriesLimitsInput): Promise<RecurrenceSeries>;
  findSeriesById(tenantId: string, seriesId: string): Promise<RecurrenceSeries | null>;
  listSeriesForProfessional(tenantId: string, professionalId: string): Promise<RecurrenceSeries[]>;
  createOccurrence(data: CreateRecurrenceOccurrenceInput): Promise<RecurrenceOccurrence>;
  findOccurrenceByBooking(
    tenantId: string,
    bookingId: string,
  ): Promise<RecurrenceOccurrence | null>;
  recordOccurrenceReschedule(data: RecordOccurrenceRescheduleInput): Promise<RecurrenceOccurrence>;
  getRescheduleUsage(
    tenantId: string,
    seriesId: string,
    occurrenceId: string,
  ): Promise<RescheduleUsage>;
}

export const IRecurrenceRepositoryToken = Symbol('IRecurrenceRepository');
