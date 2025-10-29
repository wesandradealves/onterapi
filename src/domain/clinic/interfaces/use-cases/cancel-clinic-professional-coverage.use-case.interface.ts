import { Result } from '../../../../shared/types/result.type';
import {
  CancelClinicProfessionalCoverageInput,
  ClinicProfessionalCoverage,
} from '../../types/clinic.types';

export interface ICancelClinicProfessionalCoverageUseCase {
  execute(
    input: CancelClinicProfessionalCoverageInput,
  ): Promise<Result<ClinicProfessionalCoverage>>;
  executeOrThrow(input: CancelClinicProfessionalCoverageInput): Promise<ClinicProfessionalCoverage>;
}

export const ICancelClinicProfessionalCoverageUseCase = Symbol(
  'ICancelClinicProfessionalCoverageUseCase',
);
