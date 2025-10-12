import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';

import {
  ClinicAlert,
  ClinicComparisonEntry,
  ClinicComparisonQuery,
  ClinicDashboardMetric,
  ClinicDashboardQuery,
  ClinicDashboardSnapshot,
  ClinicForecastProjection,
  TriggerClinicAlertInput,
} from '../../../domain/clinic/types/clinic.types';
import { RolesEnum } from '../../../domain/auth/enums/roles.enum';
import { IClinicMetricsRepository } from '../../../domain/clinic/interfaces/repositories/clinic-metrics.repository.interface';
import { ClinicAlertEntity } from '../entities/clinic-alert.entity';
import { ClinicDashboardMetricEntity } from '../entities/clinic-dashboard-metric.entity';
import { ClinicForecastProjectionEntity } from '../entities/clinic-forecast-projection.entity';
import { ClinicMemberEntity } from '../entities/clinic-member.entity';
import { ClinicMapper } from '../mappers/clinic.mapper';

interface AggregatedMetrics {
  revenue: number;
  appointments: number;
  occupancyRate: number;
  satisfactionScore: number;
  samples: number;
  periods: number;
}

@Injectable()
export class ClinicMetricsRepository implements IClinicMetricsRepository {
  constructor(
    @InjectRepository(ClinicDashboardMetricEntity)
    private readonly dashboardRepository: Repository<ClinicDashboardMetricEntity>,
    @InjectRepository(ClinicForecastProjectionEntity)
    private readonly forecastRepository: Repository<ClinicForecastProjectionEntity>,
    @InjectRepository(ClinicAlertEntity)
    private readonly alertRepository: Repository<ClinicAlertEntity>,
    @InjectRepository(ClinicMemberEntity)
    private readonly memberRepository: Repository<ClinicMemberEntity>,
  ) {}

  async getDashboardSnapshot(query: ClinicDashboardQuery): Promise<ClinicDashboardSnapshot> {
    const periodStart = query.filters?.from ?? new Date(0);
    const periodEnd = query.filters?.to ?? new Date();
    const monthKeys = this.buildMonthKeys(periodStart, periodEnd);

    const metricsEntities = await this.dashboardRepository.find({
      where: {
        tenantId: query.tenantId,
        ...(query.filters?.clinicIds && query.filters.clinicIds.length > 0
          ? { clinicId: In(query.filters.clinicIds) }
          : {}),
        ...(monthKeys.length > 0 ? { month: In(monthKeys) } : {}),
      },
      order: { month: 'DESC' },
    });

    const metrics = metricsEntities.map(ClinicMapper.toDashboardMetric);

    const clinics = new Set(metrics.map((metric) => metric.clinicId));
    const revenueTotal = metrics.reduce((sum, metric) => sum + metric.revenue, 0);
    const activePatientsTotal = metrics.reduce((sum, metric) => sum + metric.activePatients, 0);

    const professionals = await this.memberRepository.count({
      where: {
        tenantId: query.tenantId,
        role: RolesEnum.PROFESSIONAL,
        endedAt: IsNull(),
        ...(query.filters?.clinicIds && query.filters.clinicIds.length > 0
          ? { clinicId: In(query.filters.clinicIds) }
          : {}),
      },
    });

    const alerts = await this.alertRepository.find({
      where: {
        tenantId: query.tenantId,
        ...(query.filters?.clinicIds && query.filters.clinicIds.length > 0
          ? { clinicId: In(query.filters.clinicIds) }
          : {}),
      },
      order: { triggeredAt: 'DESC' },
      take: 20,
    });

    return {
      period: { start: periodStart, end: periodEnd },
      totals: {
        clinics: clinics.size,
        professionals,
        activePatients: activePatientsTotal,
        revenue: revenueTotal,
      },
      metrics,
      alerts: alerts.map(ClinicMapper.toAlert),
    };
  }

  async getComparison(query: ClinicComparisonQuery): Promise<ClinicComparisonEntry[]> {
    const currentMonths = this.buildMonthKeys(query.period.start, query.period.end);
    const rangeMs = query.period.end.getTime() - query.period.start.getTime();
    const previousStart = new Date(query.period.start.getTime() - rangeMs - 1);
    const previousMonths = this.buildMonthKeys(previousStart, query.period.start);

    const clinicIds = query.clinicIds && query.clinicIds.length > 0 ? query.clinicIds : undefined;

    const currentMetrics = await this.dashboardRepository.find({
      where: {
        tenantId: query.tenantId,
        ...(clinicIds ? { clinicId: In(clinicIds) } : {}),
        ...(currentMonths.length > 0 ? { month: In(currentMonths) } : {}),
      },
    });

    const previousMetrics = previousMonths.length
      ? await this.dashboardRepository.find({
          where: {
            tenantId: query.tenantId,
            ...(clinicIds ? { clinicId: In(clinicIds) } : {}),
            month: In(previousMonths),
          },
        })
      : [];

    const currentGrouped = this.groupMetricsByClinic(
      currentMetrics.map(ClinicMapper.toDashboardMetric),
    );
    const previousGrouped = this.groupMetricsByClinic(
      previousMetrics.map(ClinicMapper.toDashboardMetric),
    );

    const entries = Object.keys(currentGrouped).map((clinicId) => {
      const current = currentGrouped[clinicId];
      const previous = previousGrouped[clinicId];
      const occupancy = current.periods > 0 ? current.occupancyRate / current.periods : 0;
      const satisfaction =
        current.samples > 0 ? current.satisfactionScore / current.samples : undefined;

      return {
        clinicId,
        name: clinicId,
        revenue: current.revenue,
        revenueVariationPercentage: previous
          ? this.calculateVariation(current.revenue, previous.revenue)
          : 0,
        appointments: current.appointments,
        appointmentsVariationPercentage: previous
          ? this.calculateVariation(current.appointments, previous.appointments)
          : 0,
        occupancyRate: occupancy,
        satisfactionScore: satisfaction,
        rankingPosition: 0,
      } as ClinicComparisonEntry;
    });

    entries.sort(
      (a, b) => this.metricValueByField(b, query.metric) - this.metricValueByField(a, query.metric),
    );
    entries.forEach((entry, index) => {
      entry.rankingPosition = index + 1;
    });

    return entries;
  }

  async getForecast(query: ClinicDashboardQuery): Promise<ClinicForecastProjection[]> {
    const periodStart = query.filters?.from ?? new Date();
    const periodEnd =
      query.filters?.to ?? new Date(periodStart.getTime() + 1000 * 60 * 60 * 24 * 30);
    const clinicFilter = query.filters?.clinicIds;
    const monthKeys = this.buildMonthKeys(periodStart, periodEnd);

    const entities = await this.forecastRepository.find({
      where: {
        tenantId: query.tenantId,
        ...(clinicFilter && clinicFilter.length > 0 ? { clinicId: In(clinicFilter) } : {}),
        ...(monthKeys.length > 0 ? { month: In(monthKeys) } : {}),
      },
    });

    return entities.map(ClinicMapper.toForecastProjection);
  }

  async recordAlert(input: TriggerClinicAlertInput): Promise<ClinicAlert> {
    const entity = this.alertRepository.create({
      clinicId: input.clinicId,
      tenantId: input.tenantId,
      type: input.type,
      channel: input.channel,
      triggeredBy: input.triggeredBy,
      payload: input.payload,
    });

    const saved = await this.alertRepository.save(entity);
    return ClinicMapper.toAlert(saved);
  }

  async resolveAlert(params: {
    alertId: string;
    resolvedBy: string;
    resolvedAt?: Date;
  }): Promise<void> {
    await this.alertRepository.update(
      { id: params.alertId },
      { resolvedAt: params.resolvedAt ?? new Date(), resolvedBy: params.resolvedBy },
    );
  }

  async listAlerts(params: {
    clinicId: string;
    tenantId: string;
    types?: string[];
    activeOnly?: boolean;
    limit?: number;
  }): Promise<ClinicAlert[]> {
    const query = this.alertRepository
      .createQueryBuilder('alert')
      .where('alert.clinic_id = :clinicId', { clinicId: params.clinicId })
      .andWhere('alert.tenant_id = :tenantId', { tenantId: params.tenantId });

    if (params.types && params.types.length > 0) {
      query.andWhere('alert.type IN (:...types)', { types: params.types });
    }

    if (params.activeOnly) {
      query.andWhere('alert.resolved_at IS NULL');
    }

    query.orderBy('alert.triggered_at', 'DESC');

    if (params.limit) {
      query.take(params.limit);
    }

    const entities = await query.getMany();
    return entities.map(ClinicMapper.toAlert);
  }

  private buildMonthKeys(from: Date, to: Date): string[] {
    const result: string[] = [];
    const start = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
    const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));

    let cursor = start;
    let guard = 0;
    while (cursor <= end && guard < 60) {
      result.push(this.formatMonth(cursor));
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
      guard += 1;
    }

    return result;
  }

  private formatMonth(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  private groupMetricsByClinic(
    metrics: ClinicDashboardMetric[],
  ): Record<string, AggregatedMetrics> {
    return metrics.reduce<Record<string, AggregatedMetrics>>((acc, metric) => {
      const current = acc[metric.clinicId] ?? {
        revenue: 0,
        appointments: 0,
        occupancyRate: 0,
        satisfactionScore: 0,
        samples: 0,
        periods: 0,
      };

      current.revenue += metric.revenue;
      current.appointments += metric.appointments;
      current.occupancyRate += metric.occupancyRate;
      current.periods += 1;
      if (metric.satisfactionScore !== undefined) {
        current.satisfactionScore += metric.satisfactionScore;
        current.samples += 1;
      }

      acc[metric.clinicId] = current;
      return acc;
    }, {});
  }

  private metricValueByField(
    entry: ClinicComparisonEntry,
    metric: ClinicComparisonQuery['metric'],
  ): number {
    switch (metric) {
      case 'appointments':
        return entry.appointments;
      case 'occupancy':
        return entry.occupancyRate;
      case 'satisfaction':
        return entry.satisfactionScore ?? 0;
      default:
        return entry.revenue;
    }
  }

  private calculateVariation(current: number, previous: number): number {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }
}
