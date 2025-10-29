import {
  ClinicPaymentCredentials,
  ClinicPaymentSettings,
  ClinicPaymentStatus,
} from '../../../clinic/types/clinic.types';

export interface VerifyClinicPaymentInput {
  provider: ClinicPaymentSettings['provider'];
  credentials: ClinicPaymentCredentials;
  sandboxMode: boolean;
  paymentId: string;
}

export interface VerifyClinicPaymentResult {
  status: ClinicPaymentStatus;
  providerStatus: string;
  paidAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface ExecuteClinicPaymentPayoutInput {
  provider: ClinicPaymentSettings['provider'];
  credentials: ClinicPaymentCredentials;
  sandboxMode: boolean;
  bankAccountId: string;
  amountCents: number;
  description: string;
  externalReference: string;
  metadata?: Record<string, unknown>;
}

export interface ExecuteClinicPaymentPayoutResult {
  payoutId: string;
  status: 'processing' | 'completed';
  executedAt?: Date;
  providerResponse?: Record<string, unknown>;
}

export interface IClinicPaymentGatewayService {
  verifyPayment(input: VerifyClinicPaymentInput): Promise<VerifyClinicPaymentResult>;
  executePayout(input: ExecuteClinicPaymentPayoutInput): Promise<ExecuteClinicPaymentPayoutResult>;
}

export const IClinicPaymentGatewayService = Symbol('IClinicPaymentGatewayService');
