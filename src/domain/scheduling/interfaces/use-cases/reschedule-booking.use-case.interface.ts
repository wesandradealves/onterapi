import { Result } from '../../../../shared/types/result.type';
import { Booking } from '../../../scheduling/types/scheduling.types';

export interface RescheduleBookingUseCaseInput {
  tenantId: string;
  bookingId: string;
  expectedVersion: number;
  newStartAtUtc: Date;
  newEndAtUtc: Date;
  requesterId: string;
  requesterRole: string;
  reason: string;
}

export interface IRescheduleBookingUseCase {
  execute(input: RescheduleBookingUseCaseInput): Promise<Result<Booking>>;
  executeOrThrow(input: RescheduleBookingUseCaseInput): Promise<Booking>;
}

export const IRescheduleBookingUseCase = Symbol('IRescheduleBookingUseCase');
