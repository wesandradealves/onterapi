import {
  ClinicAlert,
  ClinicComparisonEntry,
  ClinicComparisonQuery,
  ClinicDashboardQuery,
  ClinicDashboardSnapshot,
  ClinicForecastProjection,
  TriggerClinicAlertInput,
} from '../../types/clinic.types';

export interface IClinicMetricsRepository {
  getDashboardSnapshot(query: ClinicDashboardQuery): Promise<ClinicDashboardSnapshot>;
  getComparison(query: ClinicComparisonQuery): Promise<ClinicComparisonEntry[]>;
  getForecast(query: ClinicDashboardQuery): Promise<ClinicForecastProjection[]>;
  recordAlert(input: TriggerClinicAlertInput): Promise<ClinicAlert>;
  resolveAlert(params: { alertId: string; resolvedBy: string; resolvedAt?: Date }): Promise<void>;
  listAlerts(params: {
    clinicId: string;
    tenantId: string;
    types?: string[];
    activeOnly?: boolean;
    limit?: number;
  }): Promise<ClinicAlert[]>;
}

export const IClinicMetricsRepository = Symbol('IClinicMetricsRepository');
