import { Result } from '../../../../shared/types/result.type';
import { ExternalCalendarEvent } from '../../../scheduling/types/scheduling.types';
import { ProcessClinicExternalCalendarEventInput } from '../../types/clinic.types';

export interface IProcessClinicExternalCalendarEventUseCase {
  execute(input: ProcessClinicExternalCalendarEventInput): Promise<Result<ExternalCalendarEvent>>;
  executeOrThrow(input: ProcessClinicExternalCalendarEventInput): Promise<ExternalCalendarEvent>;
}

export const IProcessClinicExternalCalendarEventUseCase = Symbol(
  'IProcessClinicExternalCalendarEventUseCase',
);
