import { Result } from '../../../../shared/types/result.type';
import { ClinicDashboardQuery, ClinicDashboardSnapshot } from '../../types/clinic.types';

export interface IGetClinicDashboardUseCase {
  execute(query: ClinicDashboardQuery): Promise<Result<ClinicDashboardSnapshot>>;
  executeOrThrow(query: ClinicDashboardQuery): Promise<ClinicDashboardSnapshot>;
}

export const IGetClinicDashboardUseCase = Symbol('IGetClinicDashboardUseCase');
