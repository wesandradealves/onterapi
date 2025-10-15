import {
  ClinicPaymentPayoutRequest,
  ClinicPaymentPayoutStatus,
  EnqueueClinicPaymentPayoutRequestInput,
} from '../../../clinic/types/clinic.types';

export interface IClinicPaymentPayoutRequestRepository {
  enqueue(
    input: EnqueueClinicPaymentPayoutRequestInput,
  ): Promise<ClinicPaymentPayoutRequest>;
  existsByFingerprint(
    clinicId: string,
    tenantId: string,
    fingerprint: string,
  ): Promise<boolean>;
  existsByTransaction(
    clinicId: string,
    tenantId: string,
    paymentTransactionId: string,
  ): Promise<boolean>;
  updateStatus(params: {
    payoutId: string;
    status: ClinicPaymentPayoutStatus;
    attempts?: number;
    lastError?: string | null;
    lastAttemptedAt?: Date | null;
    processedAt?: Date | null;
  }): Promise<void>;
}

export const IClinicPaymentPayoutRequestRepositoryToken = Symbol(
  'IClinicPaymentPayoutRequestRepository',
);
