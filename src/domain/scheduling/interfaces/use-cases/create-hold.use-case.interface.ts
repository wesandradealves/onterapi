import { Result } from '../../../../shared/types/result.type';
import { BookingHold } from '../../../scheduling/types/scheduling.types';

export interface CreateHoldUseCaseInput {
  tenantId: string;
  clinicId: string;
  professionalId: string;
  patientId: string;
  startAtUtc: Date;
  endAtUtc: Date;
  requesterId: string;
  requesterRole: string;
}

export interface ICreateHoldUseCase {
  execute(input: CreateHoldUseCaseInput): Promise<Result<BookingHold>>;
  executeOrThrow(input: CreateHoldUseCaseInput): Promise<BookingHold>;
}

export const ICreateHoldUseCase = Symbol('ICreateHoldUseCase');
