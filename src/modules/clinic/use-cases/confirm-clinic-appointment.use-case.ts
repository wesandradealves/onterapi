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
  type IConfirmClinicAppointmentUseCase,
  IConfirmClinicAppointmentUseCase as IConfirmClinicAppointmentUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/confirm-clinic-appointment.use-case.interface';
import {
  ClinicAppointment,
  ClinicAppointmentConfirmationResult,
  ClinicHoldConfirmationInput,
} from '../../../domain/clinic/types/clinic.types';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';
import { ClinicAuditService } from '../../../infrastructure/clinic/services/clinic-audit.service';

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
    private readonly auditService: ClinicAuditService,
  ) {
    super();
  }

  protected async handle(
    input: ClinicHoldConfirmationInput,
  ): Promise<ClinicAppointmentConfirmationResult> {
    const clinic = await this.clinicRepository.findByTenant(input.tenantId, input.clinicId);

    if (!clinic) {
      throw ClinicErrorFactory.clinicNotFound('Clínica não encontrada');
    }

    const hold = await this.clinicHoldRepository.findById(input.holdId);

    if (!hold || hold.clinicId !== input.clinicId || hold.tenantId !== input.tenantId) {
      throw ClinicErrorFactory.holdNotFound('Hold não encontrado para confirmação');
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
            'Registro de confirmação inconsistente para este hold',
          );
        }

        return this.toConfirmationResult(appointment);
      }

      throw ClinicErrorFactory.holdConfirmationNotAllowed('Hold já confirmado previamente');
    }

    if (hold.status === 'cancelled') {
      throw ClinicErrorFactory.holdConfirmationNotAllowed('Hold cancelado não pode ser confirmado');
    }

    if (hold.status === 'expired') {
      throw ClinicErrorFactory.holdConfirmationNotAllowed('Hold expirado não pode ser confirmado');
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
        'Hold já convertido em agendamento por outro processo',
      );
    }

    const now = new Date();

    if (hold.ttlExpiresAt <= now || hold.start <= now) {
      await this.clinicHoldRepository.expireHold(hold.id, now);
      throw ClinicErrorFactory.holdConfirmationNotAllowed('Hold expirado ou horário indisponível');
    }

    const serviceType = await this.clinicServiceTypeRepository.findById(
      hold.clinicId,
      hold.serviceTypeId,
    );

    if (!serviceType) {
      throw ClinicErrorFactory.serviceTypeNotFound(
        'Tipo de serviço associado ao hold não encontrado',
      );
    }

    const minAdvanceMinutes = Math.max(
      clinic.holdSettings?.minAdvanceMinutes ?? 0,
      serviceType.minAdvanceMinutes,
    );

    const diffMinutes = Math.floor((hold.start.getTime() - now.getTime()) / 60000);

    if (diffMinutes < minAdvanceMinutes) {
      throw ClinicErrorFactory.holdConfirmationNotAllowed(
        'Antecedência mínima para confirmação não respeitada',
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
        'Profissional já possui atendimento confirmado neste período',
      );
    }

    const allowOverbooking = clinic.holdSettings?.allowOverbooking ?? false;
    const hasPendingOverlap = overlappingHolds.some((item) => item.status === 'pending');

    if (!allowOverbooking && hasPendingOverlap) {
      throw ClinicErrorFactory.holdAlreadyExists(
        'Existe outro hold pendente para este profissional no período selecionado',
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
        'Profissional já possui agendamento confirmado em outra clínica no período',
      );
    }

    if (!input.paymentTransactionId || input.paymentTransactionId.trim().length === 0) {
      throw ClinicErrorFactory.holdConfirmationNotAllowed(
        'Transação de pagamento inválida para confirmação',
      );
    }

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
      paymentStatus: 'approved',
      confirmedAt,
      metadata: {
        confirmationIdempotencyKey: input.idempotencyKey,
      },
    });

    await this.clinicHoldRepository.confirmHold({
      ...input,
      confirmedAt,
      status: 'confirmed',
      appointmentId: appointment.id,
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
}

export const ConfirmClinicAppointmentUseCaseToken = IConfirmClinicAppointmentUseCaseToken;
