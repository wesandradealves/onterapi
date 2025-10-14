import {
  ClinicAlert,
  ClinicAlertType,
  ClinicComparisonEntry,
  ClinicComparisonQuery,
  ClinicDashboardQuery,
  ClinicDashboardSnapshot,
  ClinicFinancialSummary,
  ClinicForecastProjection,
  TriggerClinicAlertInput,
} from '../../types/clinic.types';

export interface IClinicMetricsRepository {
  getDashboardSnapshot(query: ClinicDashboardQuery): Promise<ClinicDashboardSnapshot>;
  getComparison(query: ClinicComparisonQuery): Promise<ClinicComparisonEntry[]>;
  getForecast(query: ClinicDashboardQuery): Promise<ClinicForecastProjection[]>;
  getFinancialSummary(query: ClinicDashboardQuery): Promise<ClinicFinancialSummary>;
  recordAlert(input: TriggerClinicAlertInput): Promise<ClinicAlert>;
  resolveAlert(params: {
    alertId: string;
    resolvedBy: string;
    resolvedAt?: Date;
  }): Promise<ClinicAlert | null>;
  listAlerts(params: {
    tenantId: string;
    clinicIds?: string[];
    types?: ClinicAlertType[];
    activeOnly?: boolean;
    limit?: number;
  }): Promise<ClinicAlert[]>;
  findAlertById(alertId: string): Promise<ClinicAlert | null>;
}

export const IClinicMetricsRepository = Symbol('IClinicMetricsRepository');
