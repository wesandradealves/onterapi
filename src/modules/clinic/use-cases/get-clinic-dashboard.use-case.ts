import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import {
  type IClinicMetricsRepository,
  IClinicMetricsRepository as IClinicMetricsRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-metrics.repository.interface';
import {
  ClinicDashboardQuery,
  ClinicDashboardSnapshot,
} from '../../../domain/clinic/types/clinic.types';
import {
  type IGetClinicDashboardUseCase,
  IGetClinicDashboardUseCase as IGetClinicDashboardUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/get-clinic-dashboard.use-case.interface';

@Injectable()
export class GetClinicDashboardUseCase
  extends BaseUseCase<ClinicDashboardQuery, ClinicDashboardSnapshot>
  implements IGetClinicDashboardUseCase
{
  protected readonly logger = new Logger(GetClinicDashboardUseCase.name);

  constructor(
    @Inject(IClinicMetricsRepositoryToken)
    private readonly clinicMetricsRepository: IClinicMetricsRepository,
  ) {
    super();
  }

  protected async handle(query: ClinicDashboardQuery): Promise<ClinicDashboardSnapshot> {
    return this.clinicMetricsRepository.getDashboardSnapshot(query);
  }
}

export const GetClinicDashboardUseCaseToken = IGetClinicDashboardUseCaseToken;
