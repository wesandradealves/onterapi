import { ClinicProfessionalPolicy } from '../../types/clinic.types';
import { Result } from '../../../../shared/types/result.type';

export interface GetClinicProfessionalPolicyInput {
  clinicId: string;
  tenantId: string;
  professionalId: string;
}

export interface IGetClinicProfessionalPolicyUseCase {
  execute(input: GetClinicProfessionalPolicyInput): Promise<Result<ClinicProfessionalPolicy>>;
  executeOrThrow(input: GetClinicProfessionalPolicyInput): Promise<ClinicProfessionalPolicy>;
}

export const IGetClinicProfessionalPolicyUseCase = Symbol('IGetClinicProfessionalPolicyUseCase');
