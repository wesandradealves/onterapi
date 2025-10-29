import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import {
  type IClinicMetricsRepository,
  IClinicMetricsRepository as IClinicMetricsRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-metrics.repository.interface';
import {
  ClinicComparisonEntry,
  ClinicComparisonQuery,
} from '../../../domain/clinic/types/clinic.types';
import {
  type ICompareClinicsUseCase,
  ICompareClinicsUseCase as ICompareClinicsUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/compare-clinics.use-case.interface';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';

@Injectable()
export class CompareClinicsUseCase
  extends BaseUseCase<ClinicComparisonQuery, ClinicComparisonEntry[]>
  implements ICompareClinicsUseCase
{
  private static readonly DEFAULT_LIMIT = 50;
  private static readonly MAX_LIMIT = 200;

  protected readonly logger = new Logger(CompareClinicsUseCase.name);

  constructor(
    @Inject(IClinicMetricsRepositoryToken)
    private readonly clinicMetricsRepository: IClinicMetricsRepository,
  ) {
    super();
  }

  protected async handle(input: ClinicComparisonQuery): Promise<ClinicComparisonEntry[]> {
    if (!input.period || !input.period.start || !input.period.end) {
      throw ClinicErrorFactory.invalidClinicData('Periodo de comparacao invalido');
    }

    const start = this.normalizeDate(input.period.start);
    const end = this.normalizeDate(input.period.end);

    if (!start || !end) {
      throw ClinicErrorFactory.invalidClinicData('Datas de comparacao invalidas');
    }

    const { normalizedStart, normalizedEnd } = this.normalizePeriod(start, end);

    const clinicIds =
      input.clinicIds && input.clinicIds.length > 0
        ? Array.from(new Set(input.clinicIds.filter((clinicId) => clinicId?.trim().length > 0)))
        : undefined;

    const limit = this.normalizeLimit(input.limit);

    const comparison = await this.clinicMetricsRepository.getComparison({
      tenantId: input.tenantId,
      clinicIds,
      metric: input.metric,
      period: { start: normalizedStart, end: normalizedEnd },
      limit,
    });

    return comparison;
  }

  private normalizeDate(value: Date | string): Date | null {
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === 'string') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    return null;
  }

  private normalizePeriod(start: Date, end: Date): { normalizedStart: Date; normalizedEnd: Date } {
    const startCopy = new Date(start);
    const endCopy = new Date(end);

    if (endCopy < startCopy) {
      return {
        normalizedStart: endCopy,
        normalizedEnd: startCopy,
      };
    }

    return {
      normalizedStart: startCopy,
      normalizedEnd: endCopy,
    };
  }

  private normalizeLimit(limit?: number): number | undefined {
    if (limit === undefined || limit === null) {
      return CompareClinicsUseCase.DEFAULT_LIMIT;
    }

    if (!Number.isFinite(limit) || limit <= 0) {
      return CompareClinicsUseCase.DEFAULT_LIMIT;
    }

    return Math.min(Math.floor(limit), CompareClinicsUseCase.MAX_LIMIT);
  }
}

export const CompareClinicsUseCaseToken = ICompareClinicsUseCaseToken;
