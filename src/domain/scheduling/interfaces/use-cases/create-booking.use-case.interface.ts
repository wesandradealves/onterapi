import { Result } from '../../../../shared/types/result.type';
import {
  Booking,
  BookingSource,
  PaymentStatus,
  PricingSplit,
} from '../../../scheduling/types/scheduling.types';

export interface CreateBookingUseCaseInput {
  tenantId: string;
  holdId: string;
  source: BookingSource;
  timezone: string;
  paymentStatus?: PaymentStatus;
  lateToleranceMinutes?: number;
  recurrenceSeriesId?: string | null;
  pricingSplit?: PricingSplit | null;
  preconditionsPassed?: boolean;
  anamneseRequired?: boolean;
  anamneseOverrideReason?: string | null;
  requesterId: string;
  requesterRole: string;
  requestedAtUtc?: Date;
}

export interface ICreateBookingUseCase {
  execute(input: CreateBookingUseCaseInput): Promise<Result<Booking>>;
  executeOrThrow(input: CreateBookingUseCaseInput): Promise<Booking>;
}

export const ICreateBookingUseCase = Symbol('ICreateBookingUseCase');
