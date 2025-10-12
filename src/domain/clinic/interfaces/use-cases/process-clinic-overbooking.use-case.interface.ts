import { Result } from '../../../../shared/types/result.type';
import { ClinicHold, ClinicOverbookingReviewInput } from '../../types/clinic.types';

export interface IProcessClinicOverbookingUseCase {
  execute(input: ClinicOverbookingReviewInput): Promise<Result<ClinicHold>>;
  executeOrThrow(input: ClinicOverbookingReviewInput): Promise<ClinicHold>;
}

export const IProcessClinicOverbookingUseCase = Symbol('IProcessClinicOverbookingUseCase');
