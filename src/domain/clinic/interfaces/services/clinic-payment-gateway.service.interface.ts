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

export interface IClinicPaymentGatewayService {
  verifyPayment(input: VerifyClinicPaymentInput): Promise<VerifyClinicPaymentResult>;
}

export const IClinicPaymentGatewayService = Symbol('IClinicPaymentGatewayService');
