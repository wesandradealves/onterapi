import { Result } from '../../../../shared/types/result.type';
import {
  ClinicAppointmentConfirmationResult,
  ClinicHoldConfirmationInput,
} from '../../types/clinic.types';

export interface IConfirmClinicAppointmentUseCase {
  execute(input: ClinicHoldConfirmationInput): Promise<Result<ClinicAppointmentConfirmationResult>>;
  executeOrThrow(input: ClinicHoldConfirmationInput): Promise<ClinicAppointmentConfirmationResult>;
}

export const IConfirmClinicAppointmentUseCase = Symbol('IConfirmClinicAppointmentUseCase');
