import { Result } from '../../../../shared/types/result.type';
import { ClinicHold, ClinicHoldRequestInput } from '../../types/clinic.types';

export interface ICreateClinicHoldUseCase {
  execute(input: ClinicHoldRequestInput): Promise<Result<ClinicHold>>;
  executeOrThrow(input: ClinicHoldRequestInput): Promise<ClinicHold>;
}

export const ICreateClinicHoldUseCase = Symbol('ICreateClinicHoldUseCase');
