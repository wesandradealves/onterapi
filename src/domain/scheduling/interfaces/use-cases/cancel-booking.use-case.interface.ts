import { Result } from '../../../../shared/types/result.type';
import { Booking, CancellationReason } from '../../../scheduling/types/scheduling.types';

export interface CancelBookingUseCaseInput {
  tenantId: string;
  bookingId: string;
  expectedVersion: number;
  reason?: CancellationReason | null;
  requesterId: string;
  requesterRole: string;
  cancelledAtUtc?: Date;
}

export interface ICancelBookingUseCase {
  execute(input: CancelBookingUseCaseInput): Promise<Result<Booking>>;
  executeOrThrow(input: CancelBookingUseCaseInput): Promise<Booking>;
}

export const ICancelBookingUseCase = Symbol('ICancelBookingUseCase');
