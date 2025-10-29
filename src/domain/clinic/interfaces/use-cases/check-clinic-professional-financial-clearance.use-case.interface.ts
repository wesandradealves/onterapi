import { Result } from '../../../../shared/types/result.type';
import {
  CheckClinicProfessionalFinancialClearanceInput,
  ClinicProfessionalFinancialClearanceStatus,
} from '../../types/clinic.types';

export interface ICheckClinicProfessionalFinancialClearanceUseCase {
  execute(
    input: CheckClinicProfessionalFinancialClearanceInput,
  ): Promise<Result<ClinicProfessionalFinancialClearanceStatus>>;
  executeOrThrow(
    input: CheckClinicProfessionalFinancialClearanceInput,
  ): Promise<ClinicProfessionalFinancialClearanceStatus>;
}

export const ICheckClinicProfessionalFinancialClearanceUseCase = Symbol(
  'ICheckClinicProfessionalFinancialClearanceUseCase',
);
