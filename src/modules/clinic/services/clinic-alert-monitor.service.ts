import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  ClinicAlert,
  ClinicAlertType,
  ClinicComparisonEntry,
} from '../../../domain/clinic/types/clinic.types';
import {
  IClinicRepository,
  IClinicRepository as IClinicRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic.repository.interface';
import {
  IClinicMetricsRepository,
  IClinicMetricsRepository as IClinicMetricsRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-metrics.repository.interface';
import {
  IClinicMemberRepository,
  IClinicMemberRepository as IClinicMemberRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-member.repository.interface';
import {
  ITriggerClinicAlertUseCase,
  ITriggerClinicAlertUseCase as ITriggerClinicAlertUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/trigger-clinic-alert.use-case.interface';
import { ClinicAuditService } from '../../../infrastructure/clinic/services/clinic-audit.service';

interface ClinicAlertMonitorOptions {
  enabled: boolean;
  intervalMs: number;
  lookbackDays: number;
  revenueDropThreshold: number;
  revenueMinimum: number;
  occupancyThreshold: number;
  minProfessionals: number;
  triggeredBy: string;
}

interface EvaluateTenantParams {
  tenantId: string;
  clinicIds?: string[];
  triggeredBy?: string;
  now?: Date;
}

interface EvaluateTenantResult {
  tenantId: string;
  evaluatedClinics: number;
  triggered: number;
  skipped: number;
  alerts: ClinicAlert[];
  skippedDetails: Array<{
    clinicId: string;
    type: ClinicAlertType;
    reason: string;
  }>;
}

@Injectable()
export class ClinicAlertMonitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ClinicAlertMonitorService.name);
  private readonly options: ClinicAlertMonitorOptions;
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly configService: ConfigService,
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
    @Inject(IClinicMetricsRepositoryToken)
    private readonly clinicMetricsRepository: IClinicMetricsRepository,
    @Inject(IClinicMemberRepositoryToken)
    private readonly clinicMemberRepository: IClinicMemberRepository,
    @Inject(ITriggerClinicAlertUseCaseToken)
    private readonly triggerClinicAlert: ITriggerClinicAlertUseCase,
    private readonly auditService: ClinicAuditService,
  ) {
    this.options = this.resolveOptions();
  }

  onModuleInit(): void {
    if (!this.options.enabled) {
      this.logger.log('Clinic alert monitor disabled via configuration');
      return;
    }

    if (this.options.intervalMs <= 0) {
      this.logger.warn(
        `Clinic alert monitor interval invalido (${this.options.intervalMs}). Servico permanecera inativo.`,
      );
      return;
    }

    this.logger.log(
      `Clinic alert monitor iniciado (interval=${this.options.intervalMs}ms, lookback=${this.options.lookbackDays}d)`,
    );

    this.timer = setInterval(() => {
      void this.executeCycle();
    }, this.options.intervalMs);

    void this.executeCycle();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  async evaluateTenant(params: EvaluateTenantParams): Promise<EvaluateTenantResult> {
    const now = params.now ?? new Date();
    const periodEnd = now;
    const periodStart = new Date(
      periodEnd.getTime() - this.options.lookbackDays * 24 * 60 * 60 * 1000,
    );

    const comparison = await this.clinicMetricsRepository.getComparison({
      tenantId: params.tenantId,
      clinicIds: params.clinicIds,
      metric: 'revenue',
      period: { start: periodStart, end: periodEnd },
    });

    if (comparison.length === 0) {
      return {
        tenantId: params.tenantId,
        evaluatedClinics: 0,
        triggered: 0,
        skipped: 0,
        alerts: [],
        skippedDetails: [],
      };
    }

    const clinicIds = comparison.map((entry) => entry.clinicId);
    const professionalsByClinic =
      this.options.minProfessionals > 0 && clinicIds.length > 0
        ? await this.clinicMemberRepository.countActiveProfessionalsByClinics({
            tenantId: params.tenantId,
            clinicIds,
          })
        : {};

    const monitoredTypes: ClinicAlertType[] = ['revenue_drop', 'low_occupancy'];
    const activeAlerts = await this.clinicMetricsRepository.listAlerts({
      tenantId: params.tenantId,
      clinicIds: comparison.map((entry) => entry.clinicId),
      types: monitoredTypes,
      activeOnly: true,
      limit: 500,
    });

    const activeSet = new Set(
      activeAlerts.map((alert) => this.alertKey(alert.clinicId, alert.type)),
    );
    const triggeredBy = params.triggeredBy ?? this.options.triggeredBy;

    let triggered = 0;
    let skipped = 0;
    const alerts: ClinicAlert[] = [];
    const skippedDetails: EvaluateTenantResult['skippedDetails'] = [];

    for (const entry of comparison) {
      const revenueDecision = this.shouldTriggerRevenueDrop(entry);
      if (revenueDecision.shouldTrigger) {
        const key = this.alertKey(entry.clinicId, 'revenue_drop');
        if (activeSet.has(key)) {
          skipped += 1;
          skippedDetails.push({
            clinicId: entry.clinicId,
            type: 'revenue_drop',
            reason: 'alert_already_active',
          });
        } else {
          const alert = await this.triggerRevenueDropAlert({
            tenantId: params.tenantId,
            entry,
            triggeredBy,
            periodStart,
            periodEnd,
            activeSet,
          });
          if (alert) {
            triggered += 1;
            alerts.push(alert);
          } else {
            skipped += 1;
            skippedDetails.push({
              clinicId: entry.clinicId,
              type: 'revenue_drop',
              reason: 'trigger_failed',
            });
          }
        }
      } else if (revenueDecision.reason) {
        skipped += 1;
        skippedDetails.push({
          clinicId: entry.clinicId,
          type: 'revenue_drop',
          reason: revenueDecision.reason,
        });
      }

      const occupancyDecision = this.shouldTriggerOccupancy(entry);
      if (occupancyDecision.shouldTrigger) {
        const key = this.alertKey(entry.clinicId, 'low_occupancy');
        if (activeSet.has(key)) {
          skipped += 1;
          skippedDetails.push({
            clinicId: entry.clinicId,
            type: 'low_occupancy',
            reason: 'alert_already_active',
          });
        } else {
          const alert = await this.triggerOccupancyAlert({
            tenantId: params.tenantId,
            entry,
            triggeredBy,
            periodStart,
            periodEnd,
            activeSet,
          });
          if (alert) {
            triggered += 1;
            alerts.push(alert);
          } else {
            skipped += 1;
            skippedDetails.push({
              clinicId: entry.clinicId,
              type: 'low_occupancy',
              reason: 'trigger_failed',
            });
          }
        }
      } else if (occupancyDecision.reason) {
        skipped += 1;
        skippedDetails.push({
          clinicId: entry.clinicId,
          type: 'low_occupancy',
          reason: occupancyDecision.reason,
        });
      }

      if (this.options.minProfessionals > 0) {
        const professionals = professionalsByClinic[entry.clinicId] ?? 0;
        const staffDecision = this.shouldTriggerStaffShortage(professionals);
        if (staffDecision.shouldTrigger) {
          const key = this.alertKey(entry.clinicId, 'staff_shortage');
          if (activeSet.has(key)) {
            skipped += 1;
            skippedDetails.push({
              clinicId: entry.clinicId,
              type: 'staff_shortage',
              reason: 'alert_already_active',
            });
          } else {
            const alert = await this.triggerStaffShortageAlert({
              tenantId: params.tenantId,
              entry,
              triggeredBy,
              periodStart,
              periodEnd,
              professionals,
              activeSet,
            });
            if (alert) {
              triggered += 1;
              alerts.push(alert);
            } else {
              skipped += 1;
              skippedDetails.push({
                clinicId: entry.clinicId,
                type: 'staff_shortage',
                reason: 'trigger_failed',
              });
            }
          }
        } else if (staffDecision.reason) {
          skipped += 1;
          skippedDetails.push({
            clinicId: entry.clinicId,
            type: 'staff_shortage',
            reason: staffDecision.reason,
          });
        }
      }
    }

    return {
      tenantId: params.tenantId,
      evaluatedClinics: comparison.length,
      triggered,
      skipped,
      alerts,
      skippedDetails,
    };
  }

  private async executeCycle(): Promise<void> {
    if (this.running) {
      this.logger.debug('Clinic alert monitor ja em execucao. Pulando ciclo.');
      return;
    }

    this.running = true;

    try {
      const tenantIds = await this.clinicRepository.listTenantIds();

      for (const tenantId of tenantIds) {
        try {
          const result = await this.evaluateTenant({ tenantId });
          this.logger.debug('Clinic alert monitor evaluado', result);

          await this.auditService.register({
            tenantId,
            event: 'clinic.alerts.auto_evaluation',
            performedBy: this.options.triggeredBy,
            detail: {
              evaluatedClinics: result.evaluatedClinics,
              triggered: result.triggered,
              skipped: result.skipped,
              alerts: result.alerts.map((alert) => ({
                alertId: alert.id,
                clinicId: alert.clinicId,
                type: alert.type,
              })),
              skippedDetails: result.skippedDetails,
            },
          });
        } catch (error) {
          this.logger.error(`Falha ao avaliar alertas para tenant ${tenantId}`, error as Error);
        }
      }
    } catch (error) {
      this.logger.error('Falha critica ao executar ciclo do alert monitor', error as Error);
    } finally {
      this.running = false;
    }
  }

  private shouldTriggerRevenueDrop(entry: ClinicComparisonEntry): {
    shouldTrigger: boolean;
    reason?: string;
  } {
    if (
      this.options.revenueDropThreshold <= 0 ||
      entry.revenue < this.options.revenueMinimum ||
      entry.revenue <= 0
    ) {
      return { shouldTrigger: false, reason: 'threshold_not_met' };
    }

    if (entry.revenueVariationPercentage >= -this.options.revenueDropThreshold) {
      return { shouldTrigger: false, reason: 'variation_within_threshold' };
    }

    return { shouldTrigger: true };
  }

  private shouldTriggerOccupancy(entry: ClinicComparisonEntry): {
    shouldTrigger: boolean;
    reason?: string;
  } {
    if (entry.occupancyRate >= this.options.occupancyThreshold) {
      return { shouldTrigger: false, reason: 'threshold_not_met' };
    }

    return { shouldTrigger: true };
  }

  private shouldTriggerStaffShortage(professionals: number): {
    shouldTrigger: boolean;
    reason?: string;
  } {
    if (this.options.minProfessionals <= 0) {
      return { shouldTrigger: false, reason: 'feature_disabled' };
    }

    if (professionals >= this.options.minProfessionals) {
      return { shouldTrigger: false, reason: 'sufficient_staff' };
    }

    return { shouldTrigger: true };
  }

  private async triggerRevenueDropAlert(input: {
    tenantId: string;
    entry: ClinicComparisonEntry;
    triggeredBy: string;
    periodStart: Date;
    periodEnd: Date;
    activeSet: Set<string>;
  }): Promise<ClinicAlert | null> {
    const previousRevenue = this.estimatePreviousValue(
      input.entry.revenue,
      input.entry.revenueVariationPercentage,
    );

    const alert = await this.triggerClinicAlert.executeOrThrow({
      tenantId: input.tenantId,
      clinicId: input.entry.clinicId,
      type: 'revenue_drop',
      channel: 'push',
      triggeredBy: input.triggeredBy,
      payload: {
        currentRevenue: input.entry.revenue,
        previousRevenue,
        variationPercentage: input.entry.revenueVariationPercentage,
        evaluatedPeriod: {
          start: input.periodStart.toISOString(),
          end: input.periodEnd.toISOString(),
        },
      },
    });

    input.activeSet.add(this.alertKey(input.entry.clinicId, 'revenue_drop'));
    return alert;
  }

  private async triggerOccupancyAlert(input: {
    tenantId: string;
    entry: ClinicComparisonEntry;
    triggeredBy: string;
    periodStart: Date;
    periodEnd: Date;
    activeSet: Set<string>;
  }): Promise<ClinicAlert | null> {
    const alert = await this.triggerClinicAlert.executeOrThrow({
      tenantId: input.tenantId,
      clinicId: input.entry.clinicId,
      type: 'low_occupancy',
      channel: 'push',
      triggeredBy: input.triggeredBy,
      payload: {
        occupancyRate: input.entry.occupancyRate,
        variationPercentage: input.entry.occupancyVariationPercentage,
        evaluatedPeriod: {
          start: input.periodStart.toISOString(),
          end: input.periodEnd.toISOString(),
        },
      },
    });

    input.activeSet.add(this.alertKey(input.entry.clinicId, 'low_occupancy'));
    return alert;
  }

  private async triggerStaffShortageAlert(input: {
    tenantId: string;
    entry: ClinicComparisonEntry;
    triggeredBy: string;
    periodStart: Date;
    periodEnd: Date;
    professionals: number;
    activeSet: Set<string>;
  }): Promise<ClinicAlert | null> {
    const alert = await this.triggerClinicAlert.executeOrThrow({
      tenantId: input.tenantId,
      clinicId: input.entry.clinicId,
      type: 'staff_shortage',
      channel: 'push',
      triggeredBy: input.triggeredBy,
      payload: {
        professionals: input.professionals,
        minimumRequired: this.options.minProfessionals,
        evaluatedPeriod: {
          start: input.periodStart.toISOString(),
          end: input.periodEnd.toISOString(),
        },
      },
    });

    input.activeSet.add(this.alertKey(input.entry.clinicId, 'staff_shortage'));
    return alert;
  }

  private estimatePreviousValue(current: number, variationPercentage: number): number | null {
    const denominator = 1 + variationPercentage / 100;

    if (denominator === 0) {
      return null;
    }

    return current / denominator;
  }

  private alertKey(clinicId: string, type: ClinicAlertType | string): string {
    return `${clinicId}:${type}`;
  }

  private resolveOptions(): ClinicAlertMonitorOptions {
    const enabled = this.configService.get<boolean>('CLINIC_ALERT_WORKER_ENABLED') ?? false;
    const intervalMs =
      Number(this.configService.get<number>('CLINIC_ALERT_WORKER_INTERVAL_MS') ?? 15 * 60 * 1000) ||
      0;

    const lookbackDays =
      Number(this.configService.get<number>('CLINIC_ALERT_LOOKBACK_DAYS') ?? 30) || 30;
    const revenueDropThreshold =
      Number(this.configService.get<number>('CLINIC_ALERT_REVENUE_DROP_PERCENT') ?? 20) || 20;
    const revenueMinimum =
      Number(this.configService.get<number>('CLINIC_ALERT_REVENUE_MIN')) ?? 5000;
    const occupancyThreshold =
      Number(this.configService.get<number>('CLINIC_ALERT_OCCUPANCY_THRESHOLD') ?? 0.55) || 0.55;
    const minProfessionals =
      Number(this.configService.get<number>('CLINIC_ALERT_STAFF_MIN_PROFESSIONALS') ?? 0) || 0;

    return {
      enabled,
      intervalMs,
      lookbackDays,
      revenueDropThreshold,
      revenueMinimum,
      occupancyThreshold,
      minProfessionals,
      triggeredBy: 'clinic-alert-monitor',
    };
  }
}
