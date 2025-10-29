import {
  ClinicProfessionalPolicy,
  CreateClinicProfessionalPolicyInput,
} from '../../types/clinic.types';

export interface IClinicProfessionalPolicyRepository {
  replacePolicy(input: CreateClinicProfessionalPolicyInput): Promise<ClinicProfessionalPolicy>;

  findActivePolicy(params: {
    clinicId: string;
    tenantId: string;
    professionalId: string;
  }): Promise<ClinicProfessionalPolicy | null>;
}

export const IClinicProfessionalPolicyRepository = Symbol('IClinicProfessionalPolicyRepository');
