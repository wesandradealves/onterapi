import { Inject, Injectable, Logger } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import {
  type IClinicMetricsRepository,
  IClinicMetricsRepository as IClinicMetricsRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-metrics.repository.interface';
import {
  type IClinicRepository,
  IClinicRepository as IClinicRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic.repository.interface';
import {
  type IClinicMemberRepository,
  IClinicMemberRepository as IClinicMemberRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-member.repository.interface';
import {
  type IClinicProfessionalCoverageRepository,
  IClinicProfessionalCoverageRepository as IClinicProfessionalCoverageRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-professional-coverage.repository.interface';
import {
  type ICompareClinicsUseCase,
  ICompareClinicsUseCase as ICompareClinicsUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/compare-clinics.use-case.interface';
import {
  type IGetClinicManagementOverviewUseCase,
  IGetClinicManagementOverviewUseCase as IGetClinicManagementOverviewUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/get-clinic-management-overview.use-case.interface';
import {
  Clinic,
  ClinicAlert,
  ClinicComparisonQuery,
  ClinicComplianceDocumentStatus,
  ClinicDashboardComparison,
  ClinicDashboardForecast,
  ClinicDashboardMetric,
  ClinicDashboardQuery,
  ClinicDashboardSnapshot,
  ClinicFinancialSnapshot,
  ClinicFinancialSummary,
  ClinicManagementClinicSummary,
  ClinicManagementComplianceSummary,
  ClinicManagementCoverageSummary,
  ClinicManagementOverview,
  ClinicManagementOverviewQuery,
  ClinicManagementTeamDistributionEntry,
  ClinicManagementTemplateInfo,
  ClinicManagementTemplateSectionInfo,
  ClinicProfessionalCoverageClinicSummary,
  ClinicStaffRole,
} from '../../../domain/clinic/types/clinic.types';
import { RolesEnum } from '../../../domain/auth/enums/roles.enum';

interface AggregatedClinicMetrics {
  revenue: number;
  appointments: number;
  activePatients: number;
  occupancyTotal: number;
  periods: number;
  satisfactionTotal: number;
  satisfactionSamples: number;
  contributionTotal: number;
  contributionSamples: number;
  lastActivityAt?: Date;
}

@Injectable()
export class GetClinicManagementOverviewUseCase
  extends BaseUseCase<ClinicManagementOverviewQuery, ClinicManagementOverview>
  implements IGetClinicManagementOverviewUseCase
{
  private static readonly TEAM_ROLES: ClinicStaffRole[] = [
    RolesEnum.CLINIC_OWNER,
    RolesEnum.MANAGER,
    RolesEnum.PROFESSIONAL,
    RolesEnum.SECRETARY,
  ];

  protected readonly logger = new Logger(GetClinicManagementOverviewUseCase.name);

  constructor(
    @Inject(IClinicMetricsRepositoryToken)
    private readonly clinicMetricsRepository: IClinicMetricsRepository,
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
    @Inject(IClinicMemberRepositoryToken)
    private readonly clinicMemberRepository: IClinicMemberRepository,
    @Inject(IClinicProfessionalCoverageRepositoryToken)
    private readonly clinicProfessionalCoverageRepository: IClinicProfessionalCoverageRepository,
    @Inject(ICompareClinicsUseCaseToken)
    private readonly compareClinicsUseCase: ICompareClinicsUseCase,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  protected async handle(query: ClinicManagementOverviewQuery): Promise<ClinicManagementOverview> {
    const dashboardQuery: ClinicDashboardQuery = {
      tenantId: query.tenantId,
      filters: {
        clinicIds: query.filters?.clinicIds,
        from: query.filters?.from,
        to: query.filters?.to,
      },
      includeComparisons: false,
      includeForecast: false,
    };

    const snapshot = await this.clinicMetricsRepository.getDashboardSnapshot(dashboardQuery);
    const clinics = await this.resolveClinics(query, snapshot.metrics);
    const allowedClinicIds = new Set(clinics.map((clinic) => clinic.id));

    const aggregatedMetrics = this.aggregateMetrics(snapshot.metrics, allowedClinicIds);
    const includeFinancials = query.includeFinancials ?? true;
    let financialSummary: ClinicFinancialSummary | undefined;
    let financialByClinic = new Map<string, ClinicFinancialSnapshot>();

    if (includeFinancials) {
      financialSummary = await this.clinicMetricsRepository.getFinancialSummary(dashboardQuery);
      financialByClinic = new Map(financialSummary.clinics.map((item) => [item.clinicId, item]));
    }

    const includeTeamDistribution = query.includeTeamDistribution ?? true;
    const teamDistributions = includeTeamDistribution
      ? await this.resolveTeamDistributions(Array.from(allowedClinicIds))
      : new Map<string, Record<ClinicStaffRole, number>>();

    const includeCoverageSummary = query.includeCoverageSummary ?? true;
    const coverageSummaries = includeCoverageSummary
      ? await this.resolveCoverageSummaries({
          tenantId: query.tenantId,
          clinicIds: Array.from(allowedClinicIds),
        })
      : new Map<string, ClinicManagementCoverageSummary>();

    const includeAlerts = query.includeAlerts ?? true;
    const filteredAlerts = includeAlerts
      ? snapshot.alerts.filter((alert) => allowedClinicIds.has(alert.clinicId))
      : [];
    const alertsByClinic = includeAlerts
      ? this.groupAlertsByClinic(filteredAlerts)
      : new Map<string, ClinicAlert[]>();

    const complianceDocumentsRecord =
      (await this.clinicRepository.listComplianceDocuments({
        tenantId: query.tenantId,
        clinicIds: Array.from(allowedClinicIds),
      })) ?? {};
    const complianceThresholdDays = this.resolveComplianceExpiryThreshold();
    const complianceSummaries = this.buildComplianceSummaries(
      complianceDocumentsRecord,
      complianceThresholdDays,
    );

    const clinicSummaries = await Promise.all(
      clinics.map(async (clinic) => {
        const metrics = aggregatedMetrics.get(clinic.id) ?? this.createEmptyAggregatedMetrics();

        return this.buildClinicSummary({
          clinic,
          metrics,
          financial: includeFinancials ? financialByClinic.get(clinic.id) : undefined,
          alerts: alertsByClinic.get(clinic.id) ?? [],
          teamDistribution: includeTeamDistribution
            ? this.normalizeTeamDistribution(teamDistributions.get(clinic.id))
            : undefined,
          compliance: complianceSummaries.get(clinic.id),
          coverage: includeCoverageSummary ? coverageSummaries.get(clinic.id) : undefined,
        });
      }),
    );

    const totals = this.buildTotals({
      summaries: clinicSummaries,
      snapshotTotals: snapshot.totals,
      teamDistributions,
      includeTeamDistribution,
    });

    if (includeFinancials && financialSummary) {
      totals.revenue = financialSummary.totalRevenue;
    }

    let comparisons: ClinicDashboardComparison | undefined;
    if (query.includeComparisons) {
      comparisons = await this.resolveComparisons(dashboardQuery);
      comparisons = this.filterComparisons(comparisons, allowedClinicIds);
    }

    let forecast: ClinicDashboardForecast | undefined;
    if (query.includeForecast) {
      forecast = await this.resolveForecast(dashboardQuery);
      forecast = this.filterForecast(forecast, allowedClinicIds);
    }

    return {
      period: snapshot.period,
      totals,
      clinics: clinicSummaries,
      alerts: includeAlerts ? filteredAlerts : [],
      comparisons,
      forecast,
      financials: includeFinancials ? financialSummary : undefined,
    };
  }

  private async resolveClinics(
    query: ClinicManagementOverviewQuery,
    metrics: ClinicDashboardMetric[],
  ): Promise<Clinic[]> {
    const statusFilter = query.filters?.status;

    if (query.filters?.clinicIds && query.filters.clinicIds.length > 0) {
      let clinics = await this.clinicRepository.findByIds({
        tenantId: query.tenantId,
        clinicIds: query.filters.clinicIds,
      });

      if (statusFilter && statusFilter.length > 0) {
        clinics = clinics.filter((clinic) => statusFilter.includes(clinic.status));
      }

      return clinics;
    }

    const { data: listedClinics } = await this.clinicRepository.list({
      tenantId: query.tenantId,
      status: statusFilter,
      page: 1,
      limit: 1000,
    });

    const clinicMap = new Map<string, Clinic>();
    listedClinics.forEach((clinic) => clinicMap.set(clinic.id, clinic));

    const metricClinicIds = new Set(metrics.map((metric) => metric.clinicId));
    const missingClinicIds = Array.from(metricClinicIds).filter(
      (clinicId) => !clinicMap.has(clinicId),
    );

    if (missingClinicIds.length > 0) {
      const missingClinics = await this.clinicRepository.findByIds({
        tenantId: query.tenantId,
        clinicIds: missingClinicIds,
      });
      missingClinics.forEach((clinic) => clinicMap.set(clinic.id, clinic));
    }

    const clinics = Array.from(clinicMap.values());

    if (statusFilter && statusFilter.length > 0) {
      return clinics.filter((clinic) => statusFilter.includes(clinic.status));
    }

    return clinics;
  }

  private aggregateMetrics(
    metrics: ClinicDashboardMetric[],
    allowedClinicIds: Set<string>,
  ): Map<string, AggregatedClinicMetrics> {
    return metrics.reduce<Map<string, AggregatedClinicMetrics>>((acc, metric) => {
      if (!allowedClinicIds.has(metric.clinicId)) {
        return acc;
      }

      const current = acc.get(metric.clinicId) ?? this.createEmptyAggregatedMetrics();

      current.revenue += metric.revenue;
      current.appointments += metric.appointments;
      current.activePatients += metric.activePatients;
      current.occupancyTotal += metric.occupancyRate;
      current.periods += 1;

      if (metric.satisfactionScore !== undefined) {
        current.satisfactionTotal += metric.satisfactionScore;
        current.satisfactionSamples += 1;
      }

      if (metric.contributionMargin !== undefined) {
        current.contributionTotal += metric.contributionMargin;
        current.contributionSamples += 1;
      }

      const monthDate = this.parseMonth(metric.month);
      if (monthDate && (!current.lastActivityAt || monthDate > current.lastActivityAt)) {
        current.lastActivityAt = monthDate;
      }

      acc.set(metric.clinicId, current);
      return acc;
    }, new Map<string, AggregatedClinicMetrics>());
  }

  private createEmptyAggregatedMetrics(): AggregatedClinicMetrics {
    return {
      revenue: 0,
      appointments: 0,
      activePatients: 0,
      occupancyTotal: 0,
      periods: 0,
      satisfactionTotal: 0,
      satisfactionSamples: 0,
      contributionTotal: 0,
      contributionSamples: 0,
      lastActivityAt: undefined,
    };
  }

  private async resolveTeamDistributions(
    clinicIds: string[],
  ): Promise<Map<string, Record<ClinicStaffRole, number>>> {
    if (clinicIds.length === 0) {
      return new Map();
    }

    const entries = await Promise.all(
      clinicIds.map(async (clinicId) => {
        const counts = await this.clinicMemberRepository.countByRole(clinicId);
        return [clinicId, counts] as const;
      }),
    );

    return new Map(entries);
  }

  private async resolveCoverageSummaries(params: {
    tenantId: string;
    clinicIds: string[];
  }): Promise<Map<string, ClinicManagementCoverageSummary>> {
    if (params.clinicIds.length === 0) {
      return new Map();
    }

    const entries = await this.clinicProfessionalCoverageRepository.getClinicCoverageSummaries({
      tenantId: params.tenantId,
      clinicIds: params.clinicIds,
      reference: new Date(),
    });

    return this.buildCoverageSummaries(entries);
  }

  private buildCoverageSummaries(
    entries: ClinicProfessionalCoverageClinicSummary[],
  ): Map<string, ClinicManagementCoverageSummary> {
    return entries.reduce<Map<string, ClinicManagementCoverageSummary>>((acc, entry) => {
      acc.set(entry.clinicId, {
        scheduled: entry.scheduled,
        active: entry.active,
        completedLast30Days: entry.completedLast30Days,
        lastUpdatedAt: entry.lastUpdatedAt,
      });
      return acc;
    }, new Map<string, ClinicManagementCoverageSummary>());
  }

  private groupAlertsByClinic(alerts: ClinicAlert[]): Map<string, ClinicAlert[]> {
    return alerts.reduce<Map<string, ClinicAlert[]>>((acc, alert) => {
      const clinicAlerts = acc.get(alert.clinicId) ?? [];
      clinicAlerts.push(alert);
      acc.set(alert.clinicId, clinicAlerts);
      return acc;
    }, new Map<string, ClinicAlert[]>());
  }

  private buildTotals(params: {
    summaries: ClinicManagementClinicSummary[];
    snapshotTotals: ClinicDashboardSnapshot['totals'];
    teamDistributions: Map<string, Record<ClinicStaffRole, number>>;
    includeTeamDistribution: boolean;
  }): ClinicDashboardSnapshot['totals'] {
    const clinicsCount = params.summaries.length;
    const revenueTotal = params.summaries.reduce(
      (sum, summary) => sum + summary.metrics.revenue,
      0,
    );
    const activePatientsTotal = params.summaries.reduce(
      (sum, summary) => sum + summary.metrics.activePatients,
      0,
    );

    let professionalsTotal = params.snapshotTotals.professionals;
    if (params.includeTeamDistribution) {
      professionalsTotal = params.summaries.reduce((sum, summary) => {
        const distribution = params.teamDistributions.get(summary.clinicId);
        if (!distribution) {
          return sum;
        }
        return sum + (distribution[RolesEnum.PROFESSIONAL] ?? 0);
      }, 0);
    }

    return {
      clinics: clinicsCount,
      professionals: professionalsTotal,
      activePatients: activePatientsTotal,
      revenue: revenueTotal,
    };
  }

  private normalizeTeamDistribution(
    distribution?: Record<ClinicStaffRole, number>,
  ): ClinicManagementTeamDistributionEntry[] | undefined {
    if (!distribution) {
      return undefined;
    }

    return GetClinicManagementOverviewUseCase.TEAM_ROLES.map((role) => ({
      role,
      count: distribution[role] ?? 0,
    }));
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

  private resolveComparisonMetrics(query: ClinicDashboardQuery): ClinicComparisonQuery['metric'][] {
    const allowed: ClinicComparisonQuery['metric'][] = [
      'revenue',
      'appointments',
      'patients',
      'occupancy',
      'satisfaction',
    ];

    if (query.comparisonMetrics && query.comparisonMetrics.length > 0) {
      const seen = new Set<ClinicComparisonQuery['metric']>();
      const metrics: ClinicComparisonQuery['metric'][] = [];

      query.comparisonMetrics.forEach((metric) => {
        if (allowed.includes(metric) && !seen.has(metric)) {
          seen.add(metric);
          metrics.push(metric);
        }
      });

      if (metrics.length > 0) {
        return metrics;
      }
    }

    return allowed;
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

  private parseMonth(month: string): Date | undefined {
    if (!month) {
      return undefined;
    }

    const parsed = new Date(`${month}-01T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) {
      return undefined;
    }

    return parsed;
  }

  private resolveComplianceExpiryThreshold(): number {
    const raw = this.configService.get<string | number>('CLINIC_ALERT_COMPLIANCE_EXPIRY_DAYS');
    const parsed = typeof raw === 'string' ? Number(raw) : raw;

    if (typeof parsed === 'number' && Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }

    return 30;
  }

  private buildComplianceSummaries(
    record: Record<string, ClinicComplianceDocumentStatus[]>,
    thresholdDays: number,
  ): Map<string, ClinicManagementComplianceSummary> {
    const summaries = new Map<string, ClinicManagementComplianceSummary>();

    Object.entries(record ?? {}).forEach(([clinicId, documents]) => {
      const summary = this.buildComplianceSummary(documents ?? [], thresholdDays);
      if (summary) {
        summaries.set(clinicId, summary);
      }
    });

    return summaries;
  }

  private buildComplianceSummary(
    documents: ClinicComplianceDocumentStatus[],
    thresholdDays: number,
  ): ClinicManagementComplianceSummary | undefined {
    if (!documents || documents.length === 0) {
      return undefined;
    }

    const now = new Date();
    const summary: ClinicManagementComplianceSummary = {
      total: documents.length,
      valid: 0,
      expiring: 0,
      expired: 0,
      missing: 0,
      pending: 0,
      review: 0,
      submitted: 0,
      unknown: 0,
      documents,
    };

    let nextExpiration: { type: string; expiresAt: Date } | undefined;

    documents.forEach((document) => {
      let status = document.status ?? 'unknown';
      const expiresAt = document.expiresAt instanceof Date ? document.expiresAt : undefined;

      if (expiresAt && expiresAt.getTime() < now.getTime()) {
        status = 'expired';
      }

      switch (status) {
        case 'valid':
          summary.valid += 1;
          break;
        case 'pending':
          summary.pending += 1;
          break;
        case 'review':
          summary.review += 1;
          break;
        case 'submitted':
          summary.submitted += 1;
          break;
        case 'missing':
          summary.missing += 1;
          break;
        case 'expired':
          summary.expired += 1;
          break;
        default:
          summary.unknown += 1;
          break;
      }

      if (expiresAt && expiresAt.getTime() >= now.getTime()) {
        const diffDays = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays <= thresholdDays) {
          summary.expiring += 1;
        }

        if (!nextExpiration || expiresAt < nextExpiration.expiresAt) {
          nextExpiration = { type: document.type, expiresAt };
        }
      }
    });

    if (nextExpiration) {
      summary.nextExpiration = nextExpiration;
    }

    return summary;
  }

  private async buildClinicSummary(params: {
    clinic: Clinic;
    metrics: AggregatedClinicMetrics;
    financial?: ClinicFinancialSnapshot;
    alerts: ClinicAlert[];
    teamDistribution?: ClinicManagementTeamDistributionEntry[];
    compliance?: ClinicManagementComplianceSummary;
    coverage?: ClinicManagementCoverageSummary;
  }): Promise<ClinicManagementClinicSummary> {
    const occupancyRate =
      params.metrics.periods > 0 ? params.metrics.occupancyTotal / params.metrics.periods : 0;
    const satisfactionScore =
      params.metrics.satisfactionSamples > 0
        ? params.metrics.satisfactionTotal / params.metrics.satisfactionSamples
        : undefined;
    const contributionMargin =
      params.metrics.contributionSamples > 0
        ? params.metrics.contributionTotal / params.metrics.contributionSamples
        : undefined;

    const template = this.buildTemplateInfo(params.clinic);

    return {
      clinicId: params.clinic.id,
      name: params.clinic.name,
      slug: params.clinic.slug,
      status: params.clinic.status,
      primaryOwnerId: params.clinic.primaryOwnerId,
      lastActivityAt: params.metrics.lastActivityAt,
      metrics: {
        revenue: params.metrics.revenue,
        appointments: params.metrics.appointments,
        activePatients: params.metrics.activePatients,
        occupancyRate,
        satisfactionScore,
        contributionMargin,
      },
      financials: params.financial,
      alerts: params.alerts,
      teamDistribution: params.teamDistribution,
      template,
      compliance: params.compliance,
      coverage: params.coverage,
    };
  }

  private buildTemplateInfo(clinic: Clinic): ClinicManagementTemplateInfo | undefined {
    if (!clinic.metadata || typeof clinic.metadata !== 'object') {
      return undefined;
    }

    const propagationRaw = clinic.metadata['templatePropagation'];
    if (!propagationRaw || typeof propagationRaw !== 'object') {
      return undefined;
    }

    const sectionsRaw = (propagationRaw as Record<string, unknown>)['sections'];
    if (!sectionsRaw || typeof sectionsRaw !== 'object') {
      return undefined;
    }

    const sections: ClinicManagementTemplateSectionInfo[] = [];

    Object.entries(sectionsRaw as Record<string, unknown>).forEach(([sectionKey, sectionValue]) => {
      if (!sectionValue || typeof sectionValue !== 'object') {
        return;
      }

      const sectionData = sectionValue as Record<string, unknown>;
      const templateVersionId = sectionData['templateVersionId'];
      const propagatedVersionId = sectionData['propagatedVersionId'];

      if (typeof templateVersionId !== 'string') {
        return;
      }

      const templateSection: ClinicManagementTemplateSectionInfo = {
        section: sectionKey as ClinicManagementTemplateSectionInfo['section'],
        templateVersionId,
        templateVersionNumber:
          typeof sectionData['templateVersionNumber'] === 'number'
            ? (sectionData['templateVersionNumber'] as number)
            : undefined,
        propagatedVersionId:
          typeof propagatedVersionId === 'string' ? (propagatedVersionId as string) : undefined,
        propagatedAt: this.toDate(sectionData['propagatedAt']),
        triggeredBy:
          typeof sectionData['triggeredBy'] === 'string'
            ? (sectionData['triggeredBy'] as string)
            : undefined,
      };

      const overrideRaw = sectionData['override'];
      if (overrideRaw && typeof overrideRaw === 'object') {
        const overrideData = overrideRaw as Record<string, unknown>;
        const overrideId = overrideData['overrideId'];
        const overrideVersion = overrideData['overrideVersion'];

        if (typeof overrideId === 'string' && typeof overrideVersion === 'number') {
          templateSection.override = {
            overrideId,
            overrideVersion,
            overrideHash:
              typeof overrideData['overrideHash'] === 'string'
                ? (overrideData['overrideHash'] as string)
                : undefined,
            overrideUpdatedAt: this.toDate(overrideData['updatedAt']),
            overrideUpdatedBy:
              typeof overrideData['updatedBy'] === 'string'
                ? (overrideData['updatedBy'] as string)
                : undefined,
            overrideAppliedVersionId:
              typeof overrideData['appliedConfigurationVersionId'] === 'string'
                ? (overrideData['appliedConfigurationVersionId'] as string)
                : null,
          };
        }
      }

      sections.push(templateSection);
    });

    const templateClinicId = (propagationRaw as Record<string, unknown>)['templateClinicId'];
    const lastPropagationAt = this.toDate(
      (propagationRaw as Record<string, unknown>)['lastPropagationAt'],
    );
    const lastTriggeredBy =
      typeof (propagationRaw as Record<string, unknown>)['lastTriggeredBy'] === 'string'
        ? ((propagationRaw as Record<string, unknown>)['lastTriggeredBy'] as string)
        : undefined;

    if (!templateClinicId && sections.length === 0) {
      return undefined;
    }

    return {
      templateClinicId:
        typeof templateClinicId === 'string' ? (templateClinicId as string) : undefined,
      lastPropagationAt,
      lastTriggeredBy,
      sections,
    };
  }

  private filterComparisons(
    comparison: ClinicDashboardComparison | undefined,
    allowedClinicIds: Set<string>,
  ): ClinicDashboardComparison | undefined {
    if (!comparison) {
      return undefined;
    }

    const metrics = comparison.metrics
      .map((metric) => ({
        metric: metric.metric,
        entries: metric.entries.filter((entry) => allowedClinicIds.has(entry.clinicId)),
      }))
      .filter((metric) => metric.entries.length > 0);

    if (metrics.length === 0) {
      return undefined;
    }

    return {
      period: comparison.period,
      previousPeriod: comparison.previousPeriod,
      metrics,
    };
  }

  private filterForecast(
    forecast: ClinicDashboardForecast | undefined,
    allowedClinicIds: Set<string>,
  ): ClinicDashboardForecast | undefined {
    if (!forecast) {
      return undefined;
    }

    const projections = forecast.projections.filter((projection) =>
      allowedClinicIds.has(projection.clinicId),
    );

    if (projections.length === 0) {
      return undefined;
    }

    return {
      period: forecast.period,
      projections,
    };
  }

  private toDate(value: unknown): Date | undefined {
    if (!value) {
      return undefined;
    }

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    return undefined;
  }
}

export const GetClinicManagementOverviewUseCaseToken = IGetClinicManagementOverviewUseCaseToken;
