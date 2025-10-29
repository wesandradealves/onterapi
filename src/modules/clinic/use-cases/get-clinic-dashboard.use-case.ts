import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import {
  type IClinicMetricsRepository,
  IClinicMetricsRepository as IClinicMetricsRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-metrics.repository.interface';
import {
  type ICompareClinicsUseCase,
  ICompareClinicsUseCase as ICompareClinicsUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/compare-clinics.use-case.interface';
import {
  ClinicComparisonQuery,
  ClinicDashboardComparison,
  ClinicDashboardForecast,
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
  private static readonly DEFAULT_COMPARISON_METRICS: ReadonlyArray<
    ClinicComparisonQuery['metric']
  > = ['revenue', 'appointments', 'patients', 'occupancy', 'satisfaction'];

  protected readonly logger = new Logger(GetClinicDashboardUseCase.name);

  constructor(
    @Inject(IClinicMetricsRepositoryToken)
    private readonly clinicMetricsRepository: IClinicMetricsRepository,
    @Inject(ICompareClinicsUseCaseToken)
    private readonly compareClinicsUseCase: ICompareClinicsUseCase,
  ) {
    super();
  }

  protected async handle(query: ClinicDashboardQuery): Promise<ClinicDashboardSnapshot> {
    const snapshot = await this.clinicMetricsRepository.getDashboardSnapshot(query);
    const enrichedSnapshot: ClinicDashboardSnapshot = { ...snapshot };

    if (query.includeComparisons) {
      enrichedSnapshot.comparisons = await this.resolveComparisons(query);
    }

    if (query.includeForecast) {
      enrichedSnapshot.forecast = await this.resolveForecast(query);
    }

    return enrichedSnapshot;
  }

  private async resolveComparisons(
    query: ClinicDashboardQuery,
  ): Promise<ClinicDashboardComparison> {
    const period = this.resolveComparisonPeriod(query);
    const previousPeriod = this.resolvePreviousPeriod(period);

    const metrics = this.resolveComparisonMetrics(query);
    const metricSnapshots = await Promise.all(
      metrics.map(async (metric) => {
        const entries = await this.compareClinicsUseCase.executeOrThrow({
          tenantId: query.tenantId,
          clinicIds: query.filters?.clinicIds,
          metric,
          period,
        });

        return {
          metric,
          entries,
        };
      }),
    );

    return {
      period,
      previousPeriod,
      metrics: metricSnapshots,
    };
  }

  private async resolveForecast(query: ClinicDashboardQuery): Promise<ClinicDashboardForecast> {
    const period = this.resolveForecastPeriod(query);
    const forecastQuery: ClinicDashboardQuery = {
      ...query,
      filters: {
        ...(query.filters ?? {}),
        from: period.start,
        to: period.end,
      },
    };

    const projections = await this.clinicMetricsRepository.getForecast(forecastQuery);

    return {
      period,
      projections,
    };
  }

  private resolveComparisonPeriod(query: ClinicDashboardQuery): { start: Date; end: Date } {
    const now = new Date();
    const start = query.filters?.from ?? this.startOfMonth(now);
    const end = query.filters?.to ?? now;

    return this.normalizePeriod(start, end);
  }

  private resolvePreviousPeriod(period: { start: Date; end: Date }): { start: Date; end: Date } {
    const duration = Math.max(period.end.getTime() - period.start.getTime(), 0);
    const previousPeriodEnd = new Date(period.start.getTime() - 1);
    const previousPeriodStart = new Date(previousPeriodEnd.getTime() - duration);

    return this.normalizePeriod(previousPeriodStart, previousPeriodEnd);
  }

  private resolveForecastPeriod(query: ClinicDashboardQuery): { start: Date; end: Date } {
    const start = query.filters?.from ?? new Date();
    const end =
      query.filters?.to ?? new Date(start.getTime() + 1000 * 60 * 60 * 24 * 30 /* 30 dias */);

    return this.normalizePeriod(start, end);
  }

  private resolveComparisonMetrics(query: ClinicDashboardQuery): ClinicComparisonQuery['metric'][] {
    if (query.comparisonMetrics && query.comparisonMetrics.length > 0) {
      const seen = new Set<ClinicComparisonQuery['metric']>();
      const metrics: ClinicComparisonQuery['metric'][] = [];

      query.comparisonMetrics.forEach((metric) => {
        if (
          GetClinicDashboardUseCase.DEFAULT_COMPARISON_METRICS.includes(metric) &&
          !seen.has(metric)
        ) {
          seen.add(metric);
          metrics.push(metric);
        }
      });

      if (metrics.length > 0) {
        return metrics;
      }
    }

    return [...GetClinicDashboardUseCase.DEFAULT_COMPARISON_METRICS];
  }

  private startOfMonth(reference: Date): Date {
    return new Date(reference.getFullYear(), reference.getMonth(), 1);
  }

  private normalizePeriod(start: Date, end: Date): { start: Date; end: Date } {
    const normalizedStart = new Date(start);
    const normalizedEnd = new Date(end);

    if (normalizedEnd < normalizedStart) {
      return {
        start: normalizedEnd,
        end: normalizedStart,
      };
    }

    return { start: normalizedStart, end: normalizedEnd };
  }
}

export const GetClinicDashboardUseCaseToken = IGetClinicDashboardUseCaseToken;
