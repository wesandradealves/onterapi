import { Result } from '../../../../shared/types/result.type';
import { ClinicManagementOverview, ClinicManagementOverviewQuery } from '../../types/clinic.types';

export interface IGetClinicManagementOverviewUseCase {
  execute(input: ClinicManagementOverviewQuery): Promise<Result<ClinicManagementOverview>>;
  executeOrThrow(input: ClinicManagementOverviewQuery): Promise<ClinicManagementOverview>;
}

export const IGetClinicManagementOverviewUseCase = Symbol('IGetClinicManagementOverviewUseCase');
