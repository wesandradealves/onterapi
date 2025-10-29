import { ClinicPaymentCredentials } from '../../../clinic/types/clinic.types';

export interface ResolveClinicPaymentCredentialsInput {
  credentialsId: string;
  clinicId?: string;
  tenantId?: string;
}

export interface IClinicPaymentCredentialsService {
  resolveCredentials(
    input: ResolveClinicPaymentCredentialsInput,
  ): Promise<ClinicPaymentCredentials>;
}

export const IClinicPaymentCredentialsService = Symbol('IClinicPaymentCredentialsService');
