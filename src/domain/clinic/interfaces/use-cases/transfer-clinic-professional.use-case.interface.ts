import { Result } from '../../../../shared/types/result.type';
import {
  ClinicProfessionalTransferResult,
  TransferClinicProfessionalInput,
} from '../../types/clinic.types';

export interface ITransferClinicProfessionalUseCase {
  execute(
    input: TransferClinicProfessionalInput,
  ): Promise<Result<ClinicProfessionalTransferResult>>;
  executeOrThrow(input: TransferClinicProfessionalInput): Promise<ClinicProfessionalTransferResult>;
}

export const ITransferClinicProfessionalUseCase = Symbol('ITransferClinicProfessionalUseCase');
