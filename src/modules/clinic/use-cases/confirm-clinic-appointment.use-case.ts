import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import {
  type IClinicRepository,
  IClinicRepository as IClinicRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic.repository.interface';
import {
  type IClinicHoldRepository,
  IClinicHoldRepository as IClinicHoldRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-hold.repository.interface';
import {
  type IClinicServiceTypeRepository,
  IClinicServiceTypeRepository as IClinicServiceTypeRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-service-type.repository.interface';
import {
  type IClinicAppointmentRepository,
  IClinicAppointmentRepository as IClinicAppointmentRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-appointment.repository.interface';
import {
  type IClinicConfigurationRepository,
  IClinicConfigurationRepository as IClinicConfigurationRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-configuration.repository.interface';
import {
  type IClinicPaymentCredentialsService,
  IClinicPaymentCredentialsService as IClinicPaymentCredentialsServiceToken,
} from '../../../domain/clinic/interfaces/services/clinic-payment-credentials.service.interface';
import {
  type IClinicPaymentGatewayService,
  IClinicPaymentGatewayService as IClinicPaymentGatewayServiceToken,
} from '../../../domain/clinic/interfaces/services/clinic-payment-gateway.service.interface';
import {
  type IConfirmClinicAppointmentUseCase,
  IConfirmClinicAppointmentUseCase as IConfirmClinicAppointmentUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/confirm-clinic-appointment.use-case.interface';
import {
  ClinicAppointment,
  ClinicAppointmentConfirmationResult,
  ClinicHoldConfirmationInput,
  ClinicPaymentSettings,
  ClinicPaymentStatus,
} from '../../../domain/clinic/types/clinic.types';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';
import { ClinicAuditService } from '../../../infrastructure/clinic/services/clinic-audit.service';
import { parseClinicPaymentSettings } from '../utils/payment-settings.parser';

@Injectable()
export class ConfirmClinicAppointmentUseCase
  extends BaseUseCase<ClinicHoldConfirmationInput, ClinicAppointmentConfirmationResult>
  implements IConfirmClinicAppointmentUseCase
{
  protected readonly logger = new Logger(ConfirmClinicAppointmentUseCase.name);

  constructor(
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
    @Inject(IClinicHoldRepositoryToken)
    private readonly clinicHoldRepository: IClinicHoldRepository,
    @Inject(IClinicServiceTypeRepositoryToken)
    private readonly clinicServiceTypeRepository: IClinicServiceTypeRepository,
    @Inject(IClinicAppointmentRepositoryToken)
    private readonly clinicAppointmentRepository: IClinicAppointmentRepository,
    @Inject(IClinicConfigurationRepositoryToken)
    private readonly clinicConfigurationRepository: IClinicConfigurationRepository,
    @Inject(IClinicPaymentCredentialsServiceToken)
    private readonly clinicPaymentCredentialsService: IClinicPaymentCredentialsService,
    @Inject(IClinicPaymentGatewayServiceToken)
    private readonly clinicPaymentGatewayService: IClinicPaymentGatewayService,
    private readonly auditService: ClinicAuditService,
  ) {
    super();
  }

  protected async handle(
    input: ClinicHoldConfirmationInput,
  ): Promise<ClinicAppointmentConfirmationResult> {
    const clinic = await this.clinicRepository.findByTenant(input.tenantId, input.clinicId);

    if (!clinic) {
      throw ClinicErrorFactory.clinicNotFound('Clinica nao encontrada');
    }

    const hold = await this.clinicHoldRepository.findById(input.holdId);

    if (!hold || hold.clinicId !== input.clinicId || hold.tenantId !== input.tenantId) {
      throw ClinicErrorFactory.holdNotFound('Hold nao encontrado para confirmacao');
    }

    const existingAppointment = await this.clinicAppointmentRepository.findByHoldId(hold.id);
    const metadata = (hold.metadata ?? {}) as Record<string, unknown>;
    const confirmationMetadata =
      typeof metadata.confirmation === 'object' && metadata.confirmation !== null
        ? (metadata.confirmation as Record<string, unknown>)
        : undefined;
    const storedIdempotencyKey =
      confirmationMetadata && typeof confirmationMetadata.idempotencyKey === 'string'
        ? (confirmationMetadata.idempotencyKey as string)
        : undefined;

    if (hold.status === 'confirmed') {
      if (storedIdempotencyKey && storedIdempotencyKey === input.idempotencyKey) {
        const appointment =
          existingAppointment ?? (await this.clinicAppointmentRepository.findByHoldId(hold.id));

        if (!appointment) {
          throw ClinicErrorFactory.holdConfirmationNotAllowed(
            'Registro de confirmacao inconsistente para este hold',
          );
        }

        return this.toConfirmationResult(appointment);
      }

      throw ClinicErrorFactory.holdConfirmationNotAllowed('Hold ja confirmado previamente');
    }

    if (hold.status === 'cancelled') {
      throw ClinicErrorFactory.holdConfirmationNotAllowed('Hold cancelado nao pode ser confirmado');
    }

    if (hold.status === 'expired') {
      throw ClinicErrorFactory.holdConfirmationNotAllowed('Hold expirado nao pode ser confirmado');
    }

    if (existingAppointment) {
      const appointmentIdempotencyKey =
        existingAppointment.metadata &&
        typeof existingAppointment.metadata === 'object' &&
        existingAppointment.metadata !== null
          ? (existingAppointment.metadata as Record<string, unknown>).confirmationIdempotencyKey
          : undefined;

      if (appointmentIdempotencyKey === input.idempotencyKey) {
        await this.clinicHoldRepository.confirmHold({
          ...input,
          confirmedAt: existingAppointment.confirmedAt,
          status: 'confirmed',
          appointmentId: existingAppointment.id,
        });

        return this.toConfirmationResult(existingAppointment);
      }

      throw ClinicErrorFactory.holdConfirmationNotAllowed(
        'Hold ja convertido em agendamento por outro processo',
      );
    }

    const now = new Date();

    if (hold.ttlExpiresAt <= now || hold.start <= now) {
      await this.clinicHoldRepository.expireHold(hold.id, now);
      throw ClinicErrorFactory.holdConfirmationNotAllowed('Hold expirado ou horario indisponivel');
    }

    const serviceType = await this.clinicServiceTypeRepository.findById(
      hold.clinicId,
      hold.serviceTypeId,
    );

    if (!serviceType) {
      throw ClinicErrorFactory.serviceTypeNotFound(
        'Tipo de servico associado ao hold nao encontrado',
      );
    }

    const minAdvanceMinutes = Math.max(
      clinic.holdSettings?.minAdvanceMinutes ?? 0,
      serviceType.minAdvanceMinutes,
    );

    const diffMinutes = Math.floor((hold.start.getTime() - now.getTime()) / 60000);

    if (diffMinutes < minAdvanceMinutes) {
      throw ClinicErrorFactory.holdConfirmationNotAllowed(
        'Antecedencia minima para confirmacao nao respeitada',
      );
    }

    const overlappingHolds = await this.clinicHoldRepository.findActiveOverlapByProfessional({
      tenantId: hold.tenantId,
      professionalId: hold.professionalId,
      start: hold.start,
      end: hold.end,
      excludeHoldId: hold.id,
    });

    const hasConfirmedOverlap = overlappingHolds.some((item) => item.status === 'confirmed');

    if (hasConfirmedOverlap) {
      throw ClinicErrorFactory.holdAlreadyExists(
        'Profissional ja possui atendimento confirmado neste periodo',
      );
    }

    const allowOverbooking = clinic.holdSettings?.allowOverbooking ?? false;
    const hasPendingOverlap = overlappingHolds.some((item) => item.status === 'pending');

    if (!allowOverbooking && hasPendingOverlap) {
      throw ClinicErrorFactory.holdAlreadyExists(
        'Existe outro hold pendente para este profissional no periodo selecionado',
      );
    }

    const overlappingAppointments = await this.clinicAppointmentRepository.findActiveOverlap({
      tenantId: hold.tenantId,
      professionalId: hold.professionalId,
      start: hold.start,
      end: hold.end,
    });

    if (overlappingAppointments.length > 0) {
      throw ClinicErrorFactory.holdAlreadyExists(
        'Profissional ja possui agendamento confirmado em outra clinica no periodo',
      );
    }

    if (!input.paymentTransactionId || input.paymentTransactionId.trim().length === 0) {
      throw ClinicErrorFactory.holdConfirmationNotAllowed(
        'Transacao de pagamento invalida para confirmacao',
      );
    }

    const paymentSettings = await this.resolvePaymentSettings(clinic.id);
    const credentials = await this.clinicPaymentCredentialsService.resolveCredentials({
      credentialsId: paymentSettings.credentialsId,
      clinicId: clinic.id,
      tenantId: clinic.tenantId,
    });
    const verification = await this.clinicPaymentGatewayService.verifyPayment({
      provider: paymentSettings.provider,
      credentials,
      sandboxMode: paymentSettings.sandboxMode,
      paymentId: input.paymentTransactionId,
    });

    const acceptedStatuses: ClinicPaymentStatus[] = ['approved', 'settled'];

    if (!acceptedStatuses.includes(verification.status)) {
      throw ClinicErrorFactory.holdConfirmationNotAllowed(
        'Pagamento nao esta aprovado no gateway ASAAS',
      );
    }

    const finalPaymentStatus = verification.status;
    const confirmedAt = now;

    const appointment = await this.clinicAppointmentRepository.create({
      clinicId: hold.clinicId,
      tenantId: hold.tenantId,
      holdId: hold.id,
      professionalId: hold.professionalId,
      patientId: hold.patientId,
      serviceTypeId: hold.serviceTypeId,
      start: hold.start,
      end: hold.end,
      paymentTransactionId: input.paymentTransactionId,
      paymentStatus: finalPaymentStatus,
      confirmedAt,
      metadata: {
        confirmationIdempotencyKey: input.idempotencyKey,
        gatewayStatus: verification.providerStatus,
        sandboxMode: paymentSettings.sandboxMode,
      },
    });

    await this.clinicHoldRepository.confirmHold({
      ...input,
      confirmedAt,
      status: 'confirmed',
      appointmentId: appointment.id,
      paymentStatus: finalPaymentStatus,
      gatewayStatus: verification.providerStatus,
    });

    await this.auditService.register({
      event: 'clinic.hold.confirmed',
      tenantId: hold.tenantId,
      clinicId: hold.clinicId,
      performedBy: input.confirmedBy,
      detail: {
        holdId: hold.id,
        appointmentId: appointment.id,
        paymentTransactionId: input.paymentTransactionId,
        paymentStatus: finalPaymentStatus,
        gatewayStatus: verification.providerStatus,
      },
    });

    return this.toConfirmationResult(appointment);
  }

  private toConfirmationResult(
    appointment: ClinicAppointment,
  ): ClinicAppointmentConfirmationResult {
    return {
      appointmentId: appointment.id,
      clinicId: appointment.clinicId,
      holdId: appointment.holdId,
      paymentTransactionId: appointment.paymentTransactionId,
      confirmedAt: appointment.confirmedAt,
      paymentStatus: appointment.paymentStatus,
    };
  }

  private async resolvePaymentSettings(clinicId: string): Promise<ClinicPaymentSettings> {
    const version = await this.clinicConfigurationRepository.findLatestAppliedVersion(
      clinicId,
      'payments',
    );

    if (!version) {
      throw ClinicErrorFactory.paymentConfigurationNotFound(
        'Configuracoes financeiras nao encontradas para a clinica',
      );
    }

    try {
      const rawPayload = version.payload ?? {};
      const source =
        typeof rawPayload === 'object' && rawPayload !== null && 'paymentSettings' in rawPayload
          ? (rawPayload as Record<string, unknown>).paymentSettings
          : rawPayload;

      return parseClinicPaymentSettings(source);
    } catch (error) {
      this.logger.error(
        `Falha ao interpretar configuracoes de pagamento da clinica ${clinicId}`,
        error as Error,
      );
      throw ClinicErrorFactory.paymentCredentialsInvalid(
        'Configuracoes financeiras invalidas para a clinica',
      );
    }
  }
}

export const ConfirmClinicAppointmentUseCaseToken = IConfirmClinicAppointmentUseCaseToken;