import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import {
  AvailabilityOptions,
  BookingHold,
} from '../../../domain/scheduling/types/scheduling.types';
import { BookingValidationService } from '../../../domain/scheduling/services/booking-validation.service';
import {
  IBookingRepository,
  IBookingRepositoryToken,
} from '../../../domain/scheduling/interfaces/repositories/booking.repository.interface';
import {
  IBookingHoldRepository,
  IBookingHoldRepositoryToken,
} from '../../../domain/scheduling/interfaces/repositories/booking-hold.repository.interface';
import {
  CreateHoldUseCaseInput,
  ICreateHoldUseCase,
} from '../../../domain/scheduling/interfaces/use-cases/create-hold.use-case.interface';
import { SchedulingErrorFactory } from '../../../shared/factories/scheduling-error.factory';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';
import { isFailure } from '../../../shared/types/result.type';
import {
  IClinicRepository,
  IClinicRepository as IClinicRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic.repository.interface';
import {
  IClinicServiceTypeRepository,
  IClinicServiceTypeRepository as IClinicServiceTypeRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-service-type.repository.interface';
import { ClinicHoldSettings } from '../../../domain/clinic/types/clinic.types';
import { RolesEnum } from '../../../domain/auth/enums/roles.enum';

@Injectable()
export class CreateHoldUseCase
  extends BaseUseCase<CreateHoldUseCaseInput, BookingHold>
  implements ICreateHoldUseCase
{
  protected readonly logger = new Logger(CreateHoldUseCase.name);

  constructor(
    @Inject(IBookingHoldRepositoryToken)
    private readonly holdRepository: IBookingHoldRepository,
    @Inject(IBookingRepositoryToken)
    private readonly bookingRepository: IBookingRepository,
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
    @Inject(IClinicServiceTypeRepositoryToken)
    private readonly clinicServiceTypeRepository: IClinicServiceTypeRepository,
    private readonly messageBus: MessageBus,
  ) {
    super();
  }

  protected async handle(input: CreateHoldUseCaseInput): Promise<BookingHold> {
    const { tenantId, clinicId, professionalId, patientId, startAtUtc, endAtUtc } = input;
    const requesterRole = input.requesterRole as RolesEnum | string;

    if (!this.isRoleAllowed(requesterRole)) {
      throw SchedulingErrorFactory.holdNotAllowed(
        'Perfil nao autorizado a criar hold no contexto da clinica',
      );
    }

    if (endAtUtc <= startAtUtc) {
      throw SchedulingErrorFactory.holdInvalidState(
        'Horario final deve ser posterior ao horario inicial',
      );
    }

    const nowUtc = new Date();

    if (startAtUtc <= nowUtc) {
      throw SchedulingErrorFactory.holdInvalidState('Nao e possivel criar holds no passado');
    }

    const clinic = await this.clinicRepository.findByTenant(tenantId, clinicId);

    if (!clinic) {
      throw SchedulingErrorFactory.clinicNotFound('Clinica nao encontrada para criacao de hold');
    }

    const serviceType = await this.clinicServiceTypeRepository.findById(
      clinicId,
      input.serviceTypeId,
    );

    if (!serviceType) {
      throw SchedulingErrorFactory.serviceTypeNotFound(
        'Tipo de servico nao encontrado para a clinica selecionada',
      );
    }

    if (!serviceType.isActive) {
      throw SchedulingErrorFactory.holdNotAllowed('Tipo de servico esta inativo para agendamentos');
    }

    const holdSettings = this.resolveHoldSettings(clinic.holdSettings);

    const activeBookings = await this.bookingRepository.listByProfessionalAndRange(
      tenantId,
      professionalId,
      startAtUtc,
      endAtUtc,
    );

    if (
      activeBookings.some(
        (booking) =>
          booking.status !== 'cancelled' &&
          booking.status !== 'no_show' &&
          booking.endAtUtc > startAtUtc &&
          booking.startAtUtc < endAtUtc,
      )
    ) {
      throw SchedulingErrorFactory.bookingInvalidState(
        'Profissional ja possui compromisso no periodo',
      );
    }

    const overlappingHolds = await this.holdRepository.findActiveOverlap(
      tenantId,
      professionalId,
      startAtUtc,
      endAtUtc,
    );

    if (overlappingHolds.length > 0) {
      throw SchedulingErrorFactory.holdInvalidState('Ja existe um hold ativo conflitante');
    }

    const minAdvanceMinutes = Math.max(
      holdSettings.minAdvanceMinutes,
      serviceType.minAdvanceMinutes ?? 0,
    );

    const availability: AvailabilityOptions = {
      minAdvanceMinutes,
      maxAdvanceDays: holdSettings.maxAdvanceDays,
      bufferBetweenBookingsMinutes: holdSettings.bufferBetweenBookingsMinutes,
    };

    const validation = BookingValidationService.validateAdvanceWindow({
      startAtUtc,
      nowUtc,
      availability,
      context: 'hold_creation',
    });

    if (isFailure(validation)) {
      throw validation.error;
    }

    const diffMinutes = Math.floor((startAtUtc.getTime() - nowUtc.getTime()) / 60000);

    const maxAdvanceLimit =
      serviceType.maxAdvanceMinutes ?? holdSettings.maxAdvanceMinutes ?? undefined;

    if (maxAdvanceLimit !== undefined && diffMinutes > maxAdvanceLimit) {
      throw SchedulingErrorFactory.tooFarInFuture(
        'Antecedencia maxima para criacao de holds excedida',
      );
    }

    const ttlExpiresAtUtc = this.computeHoldTtl(startAtUtc, nowUtc, holdSettings.ttlMinutes);

    const hold = await this.holdRepository.create({
      tenantId,
      clinicId,
      professionalId,
      patientId,
      serviceTypeId: input.serviceTypeId,
      startAtUtc,
      endAtUtc,
      ttlExpiresAtUtc,
    });

    await this.messageBus.publish(
      DomainEvents.schedulingHoldCreated(hold.id, {
        tenantId,
        clinicId,
        professionalId,
        patientId,
        serviceTypeId: input.serviceTypeId,
        startAtUtc,
        endAtUtc,
        ttlExpiresAtUtc: hold.ttlExpiresAtUtc,
      }),
    );

    return hold;
  }

  private isRoleAllowed(role: RolesEnum | string): boolean {
    const normalized = role as RolesEnum;
    return [
      RolesEnum.CLINIC_OWNER,
      RolesEnum.MANAGER,
      RolesEnum.SECRETARY,
      RolesEnum.PROFESSIONAL,
      RolesEnum.SUPER_ADMIN,
    ].includes(normalized);
  }

  private resolveHoldSettings(settings?: ClinicHoldSettings | null): {
    ttlMinutes: number;
    minAdvanceMinutes: number;
    maxAdvanceMinutes?: number;
    maxAdvanceDays: number;
    bufferBetweenBookingsMinutes: number;
  } {
    const fallback: ClinicHoldSettings = {
      ttlMinutes: 30,
      minAdvanceMinutes: 60,
      maxAdvanceMinutes: undefined,
      allowOverbooking: false,
      overbookingThreshold: undefined,
      resourceMatchingStrict: true,
    };

    const resolved = settings ?? fallback;
    const minAdvanceMinutes = Math.max(resolved.minAdvanceMinutes ?? 0, 0);
    const maxAdvanceMinutes =
      resolved.maxAdvanceMinutes !== undefined
        ? Math.max(resolved.maxAdvanceMinutes, 0)
        : undefined;

    const maxAdvanceDays =
      maxAdvanceMinutes && maxAdvanceMinutes > 0
        ? Math.max(1, Math.ceil(maxAdvanceMinutes / (60 * 24)))
        : 90;

    return {
      ttlMinutes: Math.max(resolved.ttlMinutes ?? 30, 1),
      minAdvanceMinutes,
      maxAdvanceMinutes,
      maxAdvanceDays,
      bufferBetweenBookingsMinutes: 15,
    };
  }

  private computeHoldTtl(startAtUtc: Date, nowUtc: Date, ttlMinutes: number): Date {
    const ttlMilliseconds = ttlMinutes * 60000;
    let ttlExpiresAt = new Date(nowUtc.getTime() + ttlMilliseconds);

    if (ttlExpiresAt >= startAtUtc) {
      ttlExpiresAt = new Date(startAtUtc.getTime() - 60000);
    }

    if (ttlExpiresAt <= nowUtc) {
      return new Date(nowUtc.getTime());
    }

    return ttlExpiresAt;
  }
}
