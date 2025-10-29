import {
  ClinicPaymentPayoutRequest,
  ClinicPaymentPayoutStatus,
  EnqueueClinicPaymentPayoutRequestInput,
} from '../../../clinic/types/clinic.types';

export interface LeaseClinicPaymentPayoutRequestsParams {
  limit: number;
  maxAttempts: number;
  retryAfterMs: number;
  stuckAfterMs: number;
}

export interface IClinicPaymentPayoutRequestRepository {
  enqueue(input: EnqueueClinicPaymentPayoutRequestInput): Promise<ClinicPaymentPayoutRequest>;
  leasePending(
    params: LeaseClinicPaymentPayoutRequestsParams,
  ): Promise<ClinicPaymentPayoutRequest[]>;
  existsByFingerprint(clinicId: string, tenantId: string, fingerprint: string): Promise<boolean>;
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
    providerPayoutId?: string | null;
    providerStatus?: string | null;
    providerPayload?: Record<string, unknown> | null;
    executedAt?: Date | null;
  }): Promise<void>;
}

export const IClinicPaymentPayoutRequestRepositoryToken = Symbol(
  'IClinicPaymentPayoutRequestRepository',
);
