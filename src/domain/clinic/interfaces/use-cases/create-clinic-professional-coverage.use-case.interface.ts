import { Result } from '../../../../shared/types/result.type';
import {
  ClinicProfessionalCoverage,
  CreateClinicProfessionalCoverageInput,
} from '../../types/clinic.types';

export interface ICreateClinicProfessionalCoverageUseCase {
  execute(
    input: CreateClinicProfessionalCoverageInput,
  ): Promise<Result<ClinicProfessionalCoverage>>;
  executeOrThrow(input: CreateClinicProfessionalCoverageInput): Promise<ClinicProfessionalCoverage>;
}

export const ICreateClinicProfessionalCoverageUseCase = Symbol(
  'ICreateClinicProfessionalCoverageUseCase',
);
