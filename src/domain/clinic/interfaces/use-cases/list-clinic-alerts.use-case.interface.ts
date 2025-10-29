import { Result } from '../../../../shared/types/result.type';
import { ClinicAlert, ClinicManagementAlertsQuery } from '../../types/clinic.types';

export interface IListClinicAlertsUseCase {
  execute(input: ClinicManagementAlertsQuery): Promise<Result<ClinicAlert[]>>;
  executeOrThrow(input: ClinicManagementAlertsQuery): Promise<ClinicAlert[]>;
}

export const IListClinicAlertsUseCase = Symbol('IListClinicAlertsUseCase');
