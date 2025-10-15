import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  IClinicPaymentPayoutRequestRepository,
  IClinicPaymentPayoutRequestRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-payment-payout-request.repository.interface';
import { ClinicPaymentPayoutRequest } from '../../../domain/clinic/types/clinic.types';
import {
  IClinicPaymentGatewayService,
  IClinicPaymentGatewayService as IClinicPaymentGatewayServiceToken,
} from '../../../domain/clinic/interfaces/services/clinic-payment-gateway.service.interface';
import {
  IClinicPaymentCredentialsService,
  IClinicPaymentCredentialsService as IClinicPaymentCredentialsServiceToken,
} from '../../../domain/clinic/interfaces/services/clinic-payment-credentials.service.interface';
import { ClinicAuditService } from '../../../infrastructure/clinic/services/clinic-audit.service';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';

interface ClinicPaymentPayoutWorkerOptions {
  enabled: boolean;
  intervalMs: number;
  batchSize: number;
  maxAttempts: number;
  retryAfterMs: number;
  stuckAfterMs: number;
}

@Injectable()
export class ClinicPaymentPayoutWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ClinicPaymentPayoutWorkerService.name);
  private readonly options: ClinicPaymentPayoutWorkerOptions;
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly configService: ConfigService,
    @Inject(IClinicPaymentPayoutRequestRepositoryToken)
    private readonly payoutRepository: IClinicPaymentPayoutRequestRepository,
    @Inject(IClinicPaymentCredentialsServiceToken)
    private readonly credentialsService: IClinicPaymentCredentialsService,
    @Inject(IClinicPaymentGatewayServiceToken)
    private readonly paymentGatewayService: IClinicPaymentGatewayService,
    private readonly auditService: ClinicAuditService,
  ) {
    this.options = this.resolveOptions();
  }

  onModuleInit(): void {
    if (!this.options.enabled) {
      this.logger.log('Clinic payment payout worker disabled via configuration');
      return;
    }

    if (this.options.intervalMs <= 0) {
      this.logger.error(
        `Clinic payment payout worker interval inválido: ${this.options.intervalMs}`,
      );
      return;
    }

    this.logger.log(
      `Clinic payment payout worker iniciado (interval=${this.options.intervalMs}ms, batch=${this.options.batchSize})`,
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

  private resolveOptions(): ClinicPaymentPayoutWorkerOptions {
    return {
      enabled: this.getBoolean('CLINIC_PAYOUT_WORKER_ENABLED', false),
      intervalMs: this.getNumber('CLINIC_PAYOUT_WORKER_INTERVAL_MS', 30_000),
      batchSize: this.getNumber('CLINIC_PAYOUT_WORKER_BATCH_SIZE', 10),
      maxAttempts: this.getNumber('CLINIC_PAYOUT_WORKER_MAX_ATTEMPTS', 6),
      retryAfterMs: this.getNumber('CLINIC_PAYOUT_WORKER_RETRY_AFTER_MS', 5 * 60_000),
      stuckAfterMs: this.getNumber('CLINIC_PAYOUT_WORKER_STUCK_AFTER_MS', 15 * 60_000),
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

  private async executeCycle(): Promise<void> {
    if (this.running) {
      this.logger.warn('Ciclo de payout ignorado (execução anterior em andamento)');
      return;
    }

    this.running = true;

    try {
      const requests = await this.payoutRepository.leasePending({
        limit: this.options.batchSize,
        maxAttempts: this.options.maxAttempts,
        retryAfterMs: this.options.retryAfterMs,
        stuckAfterMs: this.options.stuckAfterMs,
      });

      if (requests.length === 0) {
        return;
      }

      for (const request of requests) {
        await this.processRequest(request);
      }
    } catch (error) {
      this.logger.error('Erro inesperado ao executar ciclo do worker de payout', error as Error);
    } finally {
      this.running = false;
    }
  }

  private async processRequest(request: ClinicPaymentPayoutRequest): Promise<void> {
    try {
      const credentials = await this.credentialsService.resolveCredentials({
        credentialsId: request.credentialsId,
        clinicId: request.clinicId,
        tenantId: request.tenantId,
      });

      const amountCents = this.resolvePayoutAmount(request);

      if (amountCents <= 0) {
        this.logger.warn('Payout ignorado: valor calculado zero ou negativo', {
          payoutId: request.id,
          clinicId: request.clinicId,
          paymentTransactionId: request.paymentTransactionId,
        });

        const completion = new Date();
        await this.payoutRepository.updateStatus({
          payoutId: request.id,
          status: 'completed',
          attempts: request.attempts,
          lastAttemptedAt: completion,
          processedAt: completion,
          lastError: null,
          providerPayoutId: null,
          providerStatus: 'ignored_zero_amount',
          providerPayload: null,
          executedAt: completion,
        });

        await this.auditService.register({
          event: 'clinic.payment.payout_processed',
          tenantId: request.tenantId,
          clinicId: request.clinicId,
          detail: {
            payoutId: request.id,
            appointmentId: request.appointmentId,
            paymentTransactionId: request.paymentTransactionId,
            provider: request.provider,
            credentialsId: request.credentialsId,
            sandboxMode: request.sandboxMode,
            settledAt: request.settledAt.toISOString(),
            baseAmountCents: request.baseAmountCents,
            netAmountCents: request.netAmountCents ?? null,
            remainderCents: request.remainderCents,
            split: request.split,
            attempts: request.attempts,
            processedAt: completion.toISOString(),
            providerPayoutId: null,
            providerStatus: 'ignored_zero_amount',
          },
        });
        return;
      }

      if (!request.bankAccountId) {
        throw ClinicErrorFactory.paymentPayoutFailed(
          'Conta bancária destino não configurada para o payout',
        );
      }

      const payoutResult = await this.paymentGatewayService.executePayout({
        provider: credentials.provider,
        credentials,
        sandboxMode: request.sandboxMode,
        bankAccountId: request.bankAccountId,
        amountCents,
        description: `Payout ${request.paymentTransactionId}`,
        externalReference: request.id,
        metadata: {
          appointmentId: request.appointmentId,
          paymentTransactionId: request.paymentTransactionId,
          clinicId: request.clinicId,
          tenantId: request.tenantId,
          split: request.split,
          remainderCents: request.remainderCents,
        },
      });

      const processedAt =
        payoutResult.status === 'completed' ? (payoutResult.executedAt ?? new Date()) : undefined;

      await this.payoutRepository.updateStatus({
        payoutId: request.id,
        status: payoutResult.status,
        attempts: request.attempts,
        lastAttemptedAt: new Date(),
        processedAt: processedAt ?? null,
        lastError: null,
        providerPayoutId: payoutResult.payoutId ?? null,
        providerStatus: payoutResult.status,
        providerPayload: payoutResult.providerResponse ?? null,
        executedAt: processedAt ?? null,
      });

      await this.auditService.register({
        event: 'clinic.payment.payout_processed',
        tenantId: request.tenantId,
        clinicId: request.clinicId,
        detail: {
          payoutId: request.id,
          appointmentId: request.appointmentId,
          paymentTransactionId: request.paymentTransactionId,
          provider: request.provider,
          credentialsId: request.credentialsId,
          sandboxMode: request.sandboxMode,
          settledAt: request.settledAt.toISOString(),
          baseAmountCents: request.baseAmountCents,
          netAmountCents: request.netAmountCents ?? null,
          remainderCents: request.remainderCents,
          split: request.split,
          providerPayoutId: payoutResult.payoutId,
          providerStatus: payoutResult.status,
          providerResponse: payoutResult.providerResponse ?? null,
          executedAt: processedAt ? processedAt.toISOString() : null,
          attempts: request.attempts,
          processedAt: processedAt ? processedAt.toISOString() : null,
        },
      });

      this.logger.log('Payout financeiro processado com sucesso', {
        payoutId: request.id,
        clinicId: request.clinicId,
        transaction: request.paymentTransactionId,
        providerStatus: payoutResult.status,
      });
    } catch (error) {
      const message = (error as Error).message ?? 'Erro desconhecido ao processar payout';
      this.logger.error('Falha ao processar payout financeiro', error as Error, {
        payoutId: request.id,
        clinicId: request.clinicId,
        transaction: request.paymentTransactionId,
      });

      await this.payoutRepository.updateStatus({
        payoutId: request.id,
        status: 'failed',
        lastError: message.slice(0, 255),
        attempts: request.attempts,
        lastAttemptedAt: new Date(),
        providerStatus: 'failed',
        providerPayload: null,
      });
    }
  }

  private resolvePayoutAmount(request: ClinicPaymentPayoutRequest): number {
    const clinicAllocation = request.split.find((allocation) => allocation.recipient === 'clinic');

    if (clinicAllocation && clinicAllocation.amountCents > 0) {
      return clinicAllocation.amountCents;
    }

    if (request.netAmountCents && request.netAmountCents > 0) {
      return request.netAmountCents;
    }

    const baseMinusRemainder = request.baseAmountCents - Math.max(request.remainderCents, 0);
    if (baseMinusRemainder > 0) {
      return baseMinusRemainder;
    }

    return request.baseAmountCents;
  }
}
