import { Result } from '../../../../shared/types/result.type';
import { Clinic, ClinicStatus } from '../../types/clinic.types';

export interface IUpdateClinicStatusUseCase {
  execute(input: {
    tenantId: string;
    clinicId: string;
    status: ClinicStatus;
    updatedBy: string;
  }): Promise<Result<Clinic>>;
  executeOrThrow(input: {
    tenantId: string;
    clinicId: string;
    status: ClinicStatus;
    updatedBy: string;
  }): Promise<Clinic>;
}

export const IUpdateClinicStatusUseCase = Symbol('IUpdateClinicStatusUseCase');
