import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import {
  ClinicAlert,
  ClinicManagementAlertsQuery,
} from '../../../domain/clinic/types/clinic.types';
import {
  type IListClinicAlertsUseCase,
  IListClinicAlertsUseCase as IListClinicAlertsUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/list-clinic-alerts.use-case.interface';
import {
  type IClinicMetricsRepository,
  IClinicMetricsRepository as IClinicMetricsRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-metrics.repository.interface';
import {
  type IClinicRepository,
  IClinicRepository as IClinicRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic.repository.interface';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';

@Injectable()
export class ListClinicAlertsUseCase
  extends BaseUseCase<ClinicManagementAlertsQuery, ClinicAlert[]>
  implements IListClinicAlertsUseCase
{
  protected readonly logger = new Logger(ListClinicAlertsUseCase.name);

  constructor(
    @Inject(IClinicMetricsRepositoryToken)
    private readonly clinicMetricsRepository: IClinicMetricsRepository,
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
  ) {
    super();
  }

  protected async handle(query: ClinicManagementAlertsQuery): Promise<ClinicAlert[]> {
    const clinicIds = await this.resolveClinicIds(query);

    if (clinicIds.length === 0) {
      return [];
    }

    return this.clinicMetricsRepository.listAlerts({
      tenantId: query.tenantId,
      clinicIds,
      types: query.types,
      activeOnly: query.activeOnly ?? true,
      limit: query.limit,
    });
  }

  private async resolveClinicIds(query: ClinicManagementAlertsQuery): Promise<string[]> {
    if (query.clinicIds && query.clinicIds.length > 0) {
      const clinics = await this.clinicRepository.findByIds({
        tenantId: query.tenantId,
        clinicIds: query.clinicIds,
        includeDeleted: false,
      });

      if (clinics.length !== query.clinicIds.length) {
        throw ClinicErrorFactory.clinicNotFound('Uma ou mais clinicas nao foram encontradas');
      }

      return clinics.map((clinic) => clinic.id);
    }

    const clinicsPage = await this.clinicRepository.list({
      tenantId: query.tenantId,
      status: ['active', 'pending', 'suspended'],
      limit: query.limit && query.limit > 0 ? Math.min(query.limit, 200) : 200,
      page: 1,
    });

    return clinicsPage.data.map((clinic) => clinic.id);
  }
}

export const ListClinicAlertsUseCaseToken = IListClinicAlertsUseCaseToken;
