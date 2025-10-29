import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  ClinicProfessionalCoverage,
  ClinicProfessionalCoverageStatus,
} from '../../../domain/clinic/types/clinic.types';
import {
  IClinicProfessionalCoverageRepository,
  IClinicProfessionalCoverageRepository as IClinicProfessionalCoverageRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-professional-coverage.repository.interface';
import { ClinicAuditService } from '../../../infrastructure/clinic/services/clinic-audit.service';
import { ClinicCoverageSchedulingService } from './clinic-coverage-scheduling.service';

interface ClinicProfessionalCoverageWorkerOptions {
  enabled: boolean;
  intervalMs: number;
  batchSize: number;
}

@Injectable()
export class ClinicProfessionalCoverageWorkerService implements OnModuleInit, OnModuleDestroy {
  private static readonly SYSTEM_ACTOR = 'system:coverage-status-worker';

  private readonly logger = new Logger(ClinicProfessionalCoverageWorkerService.name);
  private readonly options: ClinicProfessionalCoverageWorkerOptions;
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly configService: ConfigService,
    @Inject(IClinicProfessionalCoverageRepositoryToken)
    private readonly coverageRepository: IClinicProfessionalCoverageRepository,
    private readonly auditService: ClinicAuditService,
    private readonly coverageSchedulingService: ClinicCoverageSchedulingService,
  ) {
    this.options = this.resolveOptions();
  }

  onModuleInit(): void {
    if (!this.options.enabled) {
      this.logger.log('Clinic professional coverage worker disabled via configuration');
      return;
    }

    if (this.options.intervalMs <= 0) {
      this.logger.warn(
        `Clinic professional coverage worker interval invalido (${this.options.intervalMs}). Servico permanecera inativo.`,
      );
      return;
    }

    this.logger.log(
      `Clinic professional coverage worker iniciado (interval=${this.options.intervalMs}ms, batch=${this.options.batchSize})`,
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

  private async executeCycle(): Promise<void> {
    if (this.running) {
      this.logger.verbose('Coverage worker ja em execucao. Pulando ciclo.');
      return;
    }

    this.running = true;
    try {
      const reference = new Date();
      await this.handleCompletions(reference);
      await this.handleActivations(reference);
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Falha ao processar coberturas temporarias', normalizedError);
    } finally {
      this.running = false;
    }
  }

  private async handleCompletions(reference: Date): Promise<void> {
    const dueToComplete = await this.coverageRepository.findDueToComplete({
      reference,
      limit: this.options.batchSize,
    });

    if (dueToComplete.length === 0) {
      this.logger.verbose('Nenhuma cobertura com termino vencido nesta rodada');
      return;
    }

    this.logger.log(`Processando ${dueToComplete.length} cobertura(s) para conclusao automatica`);

    for (const coverage of dueToComplete) {
      await this.transitionCoverage(coverage, 'completed', reference);
    }
  }

  private async handleActivations(reference: Date): Promise<void> {
    const toActivate = await this.coverageRepository.findScheduledToActivate({
      reference,
      limit: this.options.batchSize,
    });

    if (toActivate.length === 0) {
      this.logger.verbose('Nenhuma cobertura com inicio atingido nesta rodada');
      return;
    }

    this.logger.log(`Processando ${toActivate.length} cobertura(s) para ativacao automatica`);

    for (const coverage of toActivate) {
      await this.transitionCoverage(coverage, 'active', reference);
    }
  }

  private async transitionCoverage(
    coverage: ClinicProfessionalCoverage,
    status: ClinicProfessionalCoverageStatus,
    reference: Date,
  ): Promise<void> {
    try {
      await this.coverageRepository.updateStatus({
        tenantId: coverage.tenantId,
        clinicId: coverage.clinicId,
        coverageId: coverage.id,
        status,
        updatedBy: ClinicProfessionalCoverageWorkerService.SYSTEM_ACTOR,
      });

      const detail: Record<string, unknown> = {
        coverageId: coverage.id,
        professionalId: coverage.professionalId,
        coverageProfessionalId: coverage.coverageProfessionalId,
        startAt: coverage.startAt.toISOString(),
        endAt: coverage.endAt.toISOString(),
        transitionedAt: reference.toISOString(),
      };

      await this.auditService.register({
        tenantId: coverage.tenantId,
        clinicId: coverage.clinicId,
        performedBy: ClinicProfessionalCoverageWorkerService.SYSTEM_ACTOR,
        event:
          status === 'active'
            ? 'clinic.staff.coverage_activated'
            : 'clinic.staff.coverage_completed',
        detail,
      });

      if (status === 'active') {
        await this.coverageSchedulingService.applyCoverage(coverage, {
          triggeredBy: ClinicProfessionalCoverageWorkerService.SYSTEM_ACTOR,
          triggerSource: 'automatic',
        });
      } else if (status === 'completed') {
        await this.coverageSchedulingService.releaseCoverage(coverage, {
          reference,
          triggeredBy: ClinicProfessionalCoverageWorkerService.SYSTEM_ACTOR,
          triggerSource: 'automatic',
        });
      }
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Falha ao atualizar status da cobertura ${coverage.id} para ${status}`,
        normalizedError,
      );
    }
  }

  private resolveOptions(): ClinicProfessionalCoverageWorkerOptions {
    return {
      enabled: this.getBoolean('CLINIC_COVERAGE_WORKER_ENABLED', false),
      intervalMs: this.getNumber('CLINIC_COVERAGE_WORKER_INTERVAL_MS', 60_000),
      batchSize: Math.max(1, this.getNumber('CLINIC_COVERAGE_WORKER_BATCH_LIMIT', 50)),
    };
  }

  private getBoolean(key: string, defaultValue: boolean): boolean {
    const value = this.configService.get<string | boolean | undefined>(key);
    if (value === undefined || value === null) {
      return defaultValue;
    }
    if (typeof value === 'boolean') {
      return value;
    }
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no'].includes(normalized)) {
      return false;
    }
    return defaultValue;
  }

  private getNumber(key: string, defaultValue: number): number {
    const value = this.configService.get<string | number | undefined>(key);
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return defaultValue;
  }
}
