import { Result } from '../../../../shared/types/result.type';
import { Booking } from '../../../scheduling/types/scheduling.types';

export interface ConfirmBookingUseCaseInput {
  tenantId: string;
  bookingId: string;
  holdId: string;
  paymentStatus: 'approved';
  requesterId: string;
  requesterRole: string;
  confirmationAtUtc?: Date;
}

export interface IConfirmBookingUseCase {
  execute(input: ConfirmBookingUseCaseInput): Promise<Result<Booking>>;
  executeOrThrow(input: ConfirmBookingUseCaseInput): Promise<Booking>;
}

export const IConfirmBookingUseCase = Symbol('IConfirmBookingUseCase');
