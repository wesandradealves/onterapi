import { ClinicPaymentWebhookEventRecord } from '../../types/clinic.types';

export interface RecordClinicPaymentWebhookEventInput {
  tenantId: string;
  clinicId: string;
  provider: string;
  paymentTransactionId: string;
  fingerprint: string;
  appointmentId?: string;
  eventType?: string | null;
  gatewayStatus?: string | null;
  payloadId?: string | null;
  receivedAt: Date;
  processedAt: Date;
  expiresAt?: Date | null;
  sandbox?: boolean;
}

export interface FindClinicPaymentWebhookEventInput {
  tenantId: string;
  clinicId: string;
  provider: string;
  fingerprint: string;
}

export interface IClinicPaymentWebhookEventRepository {
  exists(params: FindClinicPaymentWebhookEventInput): Promise<boolean>;
  record(
    params: RecordClinicPaymentWebhookEventInput,
  ): Promise<ClinicPaymentWebhookEventRecord>;
  purgeExpired(reference: Date): Promise<number>;
}

export const IClinicPaymentWebhookEventRepositoryToken = Symbol(
  'IClinicPaymentWebhookEventRepository',
);
