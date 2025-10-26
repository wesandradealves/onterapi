import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  IClinicInvitationRepository,
  IClinicInvitationRepository as IClinicInvitationRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-invitation.repository.interface';
import { ClinicAuditService } from '../../../infrastructure/clinic/services/clinic-audit.service';

interface ClinicInvitationExpirationWorkerOptions {
  enabled: boolean;
  intervalMs: number;
}

@Injectable()
export class ClinicInvitationExpirationWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ClinicInvitationExpirationWorkerService.name);
  private readonly options: ClinicInvitationExpirationWorkerOptions;
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly configService: ConfigService,
    @Inject(IClinicInvitationRepositoryToken)
    private readonly invitationRepository: IClinicInvitationRepository,
    private readonly auditService: ClinicAuditService,
  ) {
    this.options = this.resolveOptions();
  }

  onModuleInit(): void {
    if (!this.options.enabled) {
      this.logger.log('Clinic invitation expiration worker disabled via configuration');
      return;
    }

    if (this.options.intervalMs <= 0) {
      this.logger.warn(
        `Clinic invitation expiration worker interval invalido (${this.options.intervalMs}). Servico permanecera inativo.`,
      );
      return;
    }

    this.logger.log(
      `Clinic invitation expiration worker iniciado (interval=${this.options.intervalMs}ms)`,
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
      this.logger.verbose('Clinic invitation expiration worker ja em execucao. Pulando ciclo.');
      return;
    }

    this.running = true;
    try {
      const expiredInvitations = await this.invitationRepository.expireInvitationsBefore(
        new Date(),
      );

      if (expiredInvitations.length > 0) {
        for (const invitation of expiredInvitations) {
          await this.auditService.register({
            tenantId: invitation.tenantId,
            clinicId: invitation.clinicId,
            event: 'clinic.invitation.expired',
            performedBy: 'system:invitation-expiration-worker',
            detail: {
              invitationId: invitation.invitationId,
              expiredAt: invitation.expiredAt.toISOString(),
              reason: 'ttl_elapsed',
            },
          });
        }

        this.logger.log(
          `Expirados ${expiredInvitations.length} convites pendentes devido ao vencimento do TTL.`,
        );
      } else {
        this.logger.verbose('Nenhum convite pendente expirado nesta rodada');
      }
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Falha ao expirar convites pendentes', normalizedError);
    } finally {
      this.running = false;
    }
  }

  private resolveOptions(): ClinicInvitationExpirationWorkerOptions {
    return {
      enabled: this.getBoolean('CLINIC_INVITATION_EXPIRATION_WORKER_ENABLED', false),
      intervalMs: this.getNumber('CLINIC_INVITATION_EXPIRATION_WORKER_INTERVAL_MS', 5 * 60_000),
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
