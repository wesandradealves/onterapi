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
import { ClinicHold, ClinicHoldRequestInput } from '../../../domain/clinic/types/clinic.types';
import {
  type ICreateClinicHoldUseCase,
  ICreateClinicHoldUseCase as ICreateClinicHoldUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/create-clinic-hold.use-case.interface';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';
import { ClinicAuditService } from '../../../infrastructure/clinic/services/clinic-audit.service';

@Injectable()
export class CreateClinicHoldUseCase
  extends BaseUseCase<ClinicHoldRequestInput, ClinicHold>
  implements ICreateClinicHoldUseCase
{
  protected readonly logger = new Logger(CreateClinicHoldUseCase.name);

  constructor(
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
    @Inject(IClinicHoldRepositoryToken)
    private readonly clinicHoldRepository: IClinicHoldRepository,
    @Inject(IClinicServiceTypeRepositoryToken)
    private readonly clinicServiceTypeRepository: IClinicServiceTypeRepository,
    private readonly auditService: ClinicAuditService,
  ) {
    super();
  }

  protected async handle(input: ClinicHoldRequestInput): Promise<ClinicHold> {
    const clinic = await this.clinicRepository.findByTenant(input.tenantId, input.clinicId);

    if (!clinic) {
      throw ClinicErrorFactory.clinicNotFound('Clínica não encontrada');
    }

    const existing = await this.clinicHoldRepository.findByIdempotencyKey(
      input.clinicId,
      input.tenantId,
      input.idempotencyKey,
    );

    if (existing) {
      return existing;
    }

    const serviceType = await this.clinicServiceTypeRepository.findById(
      input.clinicId,
      input.serviceTypeId,
    );

    if (!serviceType) {
      throw ClinicErrorFactory.serviceTypeNotFound('Tipo de serviço não encontrado');
    }

    const now = new Date();
    const start = new Date(input.start);
    const end = new Date(input.end);

    if (end <= start) {
      throw ClinicErrorFactory.invalidHoldWindow('Horário final deve ser posterior ao inicial');
    }

    if (start <= now) {
      throw ClinicErrorFactory.invalidHoldWindow('Não é possível criar holds no passado');
    }

    const diffMinutes = Math.floor((start.getTime() - now.getTime()) / 60000);
    const minAdvance = Math.max(
      clinic.holdSettings?.minAdvanceMinutes ?? 0,
      serviceType.minAdvanceMinutes,
    );

    if (diffMinutes < minAdvance) {
      throw ClinicErrorFactory.invalidHoldWindow(
        'Antecedência mínima para criação de holds não respeitada',
      );
    }

    if (serviceType.maxAdvanceMinutes && diffMinutes > serviceType.maxAdvanceMinutes) {
      throw ClinicErrorFactory.invalidHoldWindow('Antecedência máxima excedida para este serviço');
    }

    const ttlMinutes = clinic.holdSettings?.ttlMinutes ?? 30;
    const ttlExpiresAt = new Date(now.getTime() + ttlMinutes * 60000);

    if (ttlExpiresAt >= start) {
      ttlExpiresAt.setTime(start.getTime() - 60 * 1000);
    }

    const overlappingHolds = await this.clinicHoldRepository.findActiveOverlapByProfessional({
      tenantId: input.tenantId,
      professionalId: input.professionalId,
      start,
      end,
    });

    const allowOverbooking = clinic.holdSettings?.allowOverbooking ?? false;

    const hasConfirmedOverlap = overlappingHolds.some((hold) => hold.status === 'confirmed');

    if (hasConfirmedOverlap) {
      throw ClinicErrorFactory.holdAlreadyExists(
        'Profissional já possui atendimento confirmado para este período',
      );
    }

    if (!allowOverbooking && overlappingHolds.length > 0) {
      throw ClinicErrorFactory.holdAlreadyExists(
        'Já existe um compromisso ativo para este profissional no período solicitado',
      );
    }

    const hold = await this.clinicHoldRepository.create({
      ...input,
      start,
      end,
      ttlExpiresAt,
    });

    await this.auditService.register({
      event: 'clinic.hold.created',
      clinicId: input.clinicId,
      tenantId: input.tenantId,
      performedBy: input.requestedBy,
      detail: {
        professionalId: input.professionalId,
        patientId: input.patientId,
        serviceTypeId: input.serviceTypeId,
        start,
        end,
        ttlExpiresAt,
      },
    });

    return hold;
  }
}

export const CreateClinicHoldUseCaseToken = ICreateClinicHoldUseCaseToken;
