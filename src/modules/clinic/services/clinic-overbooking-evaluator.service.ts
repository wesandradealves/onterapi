import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  ClinicDashboardMetric,
  ClinicDashboardQuery,
} from '../../../domain/clinic/types/clinic.types';
import {
  IClinicMetricsRepository,
  IClinicMetricsRepository as IClinicMetricsRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-metrics.repository.interface';

export interface ClinicOverbookingEvaluationParams {
  tenantId: string;
  clinicId: string;
  professionalId: string;
  serviceTypeId: string;
  start: Date;
  overlaps: number;
}

export interface ClinicOverbookingEvaluation {
  riskScore: number;
  reasons: string[];
  context: {
    averageOccupancy: number;
    averageSatisfaction?: number;
    totalAppointments: number;
    overlapCount: number;
  };
}

@Injectable()
export class ClinicOverbookingEvaluatorService {
  private static readonly LOOKBACK_DAYS = 45;

  private readonly logger = new Logger(ClinicOverbookingEvaluatorService.name);

  constructor(
    @Inject(IClinicMetricsRepositoryToken)
    private readonly clinicMetricsRepository: IClinicMetricsRepository,
  ) {}

  async evaluate(params: ClinicOverbookingEvaluationParams): Promise<ClinicOverbookingEvaluation> {
    try {
      const snapshot = await this.fetchMetrics(params);
      const clinicMetrics = snapshot.metrics.filter(
        (metric) => metric.clinicId === params.clinicId,
      );

      const averageOccupancy = this.calculateAverageOccupancy(clinicMetrics);
      const averageSatisfaction = this.calculateAverageSatisfaction(clinicMetrics);
      const totalAppointments = clinicMetrics.reduce((sum, metric) => sum + metric.appointments, 0);

      const reasons: string[] = [];
      let riskScore = 35;

      if (averageOccupancy < 0.55) {
        riskScore += 25;
        reasons.push('low_occupancy');
      } else if (averageOccupancy < 0.7) {
        riskScore += 12;
        reasons.push('moderate_occupancy');
      }

      if (totalAppointments >= 60 && averageOccupancy < 0.65) {
        riskScore += 8;
        reasons.push('high_volume_pressure');
      }

      if (averageSatisfaction !== undefined && averageSatisfaction < 4) {
        riskScore += 5;
        reasons.push('satisfaction_pressure');
      }

      const overlapWeight = Math.min(params.overlaps * 4, 12);
      if (overlapWeight > 0) {
        riskScore += overlapWeight;
        reasons.push(params.overlaps > 1 ? 'multiple_overlaps' : 'single_overlap');
      }

      if (this.hasLowOccupancyAlert(snapshot.metrics, params.clinicId)) {
        riskScore += 8;
        reasons.push('alert_low_occupancy');
      }

      const normalizedRisk = Math.min(95, Math.max(10, Math.round(riskScore)));

      return {
        riskScore: normalizedRisk,
        reasons,
        context: {
          averageOccupancy,
          averageSatisfaction,
          totalAppointments,
          overlapCount: params.overlaps,
        },
      };
    } catch (error) {
      this.logger.warn('Falha ao avaliar risco de overbooking; usando heuristica padrao', {
        clinicId: params.clinicId,
        tenantId: params.tenantId,
        error: (error as Error).message,
      });

      return {
        riskScore: 55,
        reasons: ['fallback'],
        context: {
          averageOccupancy: 0,
          totalAppointments: 0,
          overlapCount: params.overlaps,
        },
      };
    }
  }

  private async fetchMetrics(
    params: ClinicOverbookingEvaluationParams,
  ): Promise<Awaited<ReturnType<IClinicMetricsRepository['getDashboardSnapshot']>>> {
    const lookbackStart = new Date(
      params.start.getTime() -
        ClinicOverbookingEvaluatorService.LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
    );

    const query: ClinicDashboardQuery = {
      tenantId: params.tenantId,
      filters: {
        clinicIds: [params.clinicId],
        from: lookbackStart,
        to: params.start,
      },
      includeComparisons: false,
      includeForecast: false,
    };

    return await this.clinicMetricsRepository.getDashboardSnapshot(query);
  }

  private calculateAverageOccupancy(metrics: ClinicDashboardMetric[]): number {
    if (metrics.length === 0) {
      return 0;
    }

    const totalOccupancy = metrics.reduce((sum, metric) => sum + (metric.occupancyRate ?? 0), 0);

    return totalOccupancy / metrics.length;
  }

  private calculateAverageSatisfaction(metrics: ClinicDashboardMetric[]): number | undefined {
    const satisfactionSamples = metrics
      .map((metric) => metric.satisfactionScore)
      .filter((score): score is number => typeof score === 'number');

    if (satisfactionSamples.length === 0) {
      return undefined;
    }

    const total = satisfactionSamples.reduce((sum, score) => sum + score, 0);
    return total / satisfactionSamples.length;
  }

  private hasLowOccupancyAlert(metrics: ClinicDashboardMetric[], clinicId: string): boolean {
    return metrics.some(
      (metric) =>
        metric.clinicId === clinicId &&
        metric.occupancyRate !== undefined &&
        metric.occupancyRate < 0.6,
    );
  }
}
