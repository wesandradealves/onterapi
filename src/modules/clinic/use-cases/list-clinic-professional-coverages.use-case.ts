import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import {
  type IClinicProfessionalCoverageRepository,
  IClinicProfessionalCoverageRepository as IClinicProfessionalCoverageRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-professional-coverage.repository.interface';
import {
  type IListClinicProfessionalCoveragesUseCase,
  IListClinicProfessionalCoveragesUseCase as IListClinicProfessionalCoveragesUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/list-clinic-professional-coverages.use-case.interface';
import {
  ClinicProfessionalCoverage,
  ClinicProfessionalCoverageStatus,
  ListClinicProfessionalCoveragesQuery,
} from '../../../domain/clinic/types/clinic.types';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';

type ListResult = {
  data: ClinicProfessionalCoverage[];
  total: number;
  page: number;
  limit: number;
};

@Injectable()
export class ListClinicProfessionalCoveragesUseCase
  extends BaseUseCase<ListClinicProfessionalCoveragesQuery, ListResult>
  implements IListClinicProfessionalCoveragesUseCase
{
  protected readonly logger = new Logger(ListClinicProfessionalCoveragesUseCase.name);

  constructor(
    @Inject(IClinicProfessionalCoverageRepositoryToken)
    private readonly coverageRepository: IClinicProfessionalCoverageRepository,
  ) {
    super();
  }

  protected async handle(query: ListClinicProfessionalCoveragesQuery): Promise<ListResult> {
    const normalizedQuery = this.normalizeQuery(query);
    return this.coverageRepository.list(normalizedQuery);
  }

  private normalizeQuery(
    query: ListClinicProfessionalCoveragesQuery,
  ): ListClinicProfessionalCoveragesQuery {
    if (!query.tenantId) {
      throw ClinicErrorFactory.invalidClinicData('Tenant obrigatorio para listar coberturas');
    }

    const normalized: ListClinicProfessionalCoveragesQuery = {
      tenantId: query.tenantId,
      professionalId: query.professionalId,
      coverageProfessionalId: query.coverageProfessionalId,
      includeCancelled: query.includeCancelled ?? false,
      page: query.page && query.page > 0 ? query.page : 1,
      limit: query.limit && query.limit > 0 ? Math.min(Math.floor(query.limit), 200) : undefined,
    };

    const clinicIds =
      query.clinicIds && query.clinicIds.length > 0
        ? Array.from(
            new Set(
              query.clinicIds
                .map((clinicId) => clinicId?.trim())
                .filter(
                  (clinicId): clinicId is string =>
                    typeof clinicId === 'string' && clinicId.length > 0,
                ),
            ),
          )
        : undefined;

    if (clinicIds && clinicIds.length > 0) {
      normalized.clinicIds = clinicIds;
      if (query.clinicId && clinicIds.includes(query.clinicId)) {
        normalized.clinicId = query.clinicId;
      }
    } else if (query.clinicId) {
      normalized.clinicId = query.clinicId;
    }

    if (query.from) {
      const from = new Date(query.from);
      if (Number.isNaN(from.getTime())) {
        throw ClinicErrorFactory.invalidClinicData('Filtro "from" invalido');
      }
      normalized.from = from;
    }

    if (query.to) {
      const to = new Date(query.to);
      if (Number.isNaN(to.getTime())) {
        throw ClinicErrorFactory.invalidClinicData('Filtro "to" invalido');
      }
      normalized.to = to;
    }

    if (normalized.from && normalized.to && normalized.from.getTime() > normalized.to.getTime()) {
      throw ClinicErrorFactory.invalidClinicData(
        'Filtro de periodo das coberturas esta invertido (from > to)',
      );
    }

    if (query.statuses && query.statuses.length > 0) {
      const statuses = Array.from(new Set(query.statuses));
      statuses.forEach((status) => this.ensureValidStatus(status));
      normalized.statuses = statuses as ClinicProfessionalCoverageStatus[];
    }

    return normalized;
  }

  private ensureValidStatus(status: ClinicProfessionalCoverageStatus): void {
    const allowedStatuses: ClinicProfessionalCoverageStatus[] = [
      'scheduled',
      'active',
      'completed',
      'cancelled',
    ];

    if (!allowedStatuses.includes(status)) {
      throw ClinicErrorFactory.invalidClinicData(`Status de cobertura invalido: ${status}`);
    }
  }
}

export const ListClinicProfessionalCoveragesUseCaseToken =
  IListClinicProfessionalCoveragesUseCaseToken;
