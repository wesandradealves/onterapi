import { Result } from '../../../../shared/types/result.type';
import { Booking, PaymentStatus } from '../../../scheduling/types/scheduling.types';

export interface RecordPaymentStatusUseCaseInput {
  tenantId: string;
  bookingId: string;
  expectedVersion: number;
  paymentStatus: PaymentStatus;
  requesterId: string;
  requesterRole: string;
}

export interface IRecordPaymentStatusUseCase {
  execute(input: RecordPaymentStatusUseCaseInput): Promise<Result<Booking>>;
  executeOrThrow(input: RecordPaymentStatusUseCaseInput): Promise<Booking>;
}

export const IRecordPaymentStatusUseCase = Symbol('IRecordPaymentStatusUseCase');
