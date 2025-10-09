import { Result } from '../../../../shared/types/result.type';
import { Booking } from '../../../scheduling/types/scheduling.types';

export interface MarkBookingNoShowUseCaseInput {
  tenantId: string;
  bookingId: string;
  expectedVersion: number;
  markedAtUtc: Date;
}

export interface IMarkBookingNoShowUseCase {
  execute(input: MarkBookingNoShowUseCaseInput): Promise<Result<Booking>>;
  executeOrThrow(input: MarkBookingNoShowUseCaseInput): Promise<Booking>;
}

export const IMarkBookingNoShowUseCase = Symbol('IMarkBookingNoShowUseCase');
