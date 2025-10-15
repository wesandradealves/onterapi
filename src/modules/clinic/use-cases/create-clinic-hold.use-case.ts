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
import {
  type ClinicOverbookingEvaluation,
  ClinicOverbookingEvaluatorService,
} from '../services/clinic-overbooking-evaluator.service';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';

type OverbookingMetadata = ClinicOverbookingEvaluation & {
  status: 'approved' | 'pending_review';
  threshold: number;
  evaluatedAt: string;
  autoApproved?: boolean;
  requiresManualApproval?: boolean;
};

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
    private readonly messageBus: MessageBus,
    private readonly overbookingEvaluator: ClinicOverbookingEvaluatorService,
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

    const metadata: Record<string, unknown> =
      input.metadata && typeof input.metadata === 'object' ? { ...input.metadata } : {};

    let overbookingMetadata: OverbookingMetadata | undefined;

    if (overlappingHolds.length > 0) {
      const evaluation = await this.overbookingEvaluator.evaluate({
        tenantId: input.tenantId,
        clinicId: input.clinicId,
        professionalId: input.professionalId,
        serviceTypeId: input.serviceTypeId,
        start,
        overlaps: overlappingHolds.length,
      });

      const threshold = clinic.holdSettings?.overbookingThreshold ?? 70;
      const evaluatedAt = now.toISOString();

      if (evaluation.riskScore < threshold) {
        overbookingMetadata = {
          ...evaluation,
          status: 'pending_review',
          threshold,
          evaluatedAt,
          requiresManualApproval: true,
        };
      } else {
        overbookingMetadata = {
          ...evaluation,
          status: 'approved',
          threshold,
          evaluatedAt,
          autoApproved: true,
        };
      }
    }

    const normalizedLocationId =
      typeof input.locationId === 'string' && input.locationId.trim().length > 0
        ? input.locationId.trim()
        : undefined;
    const enforceResourceIsolation = clinic.holdSettings?.resourceMatchingStrict ?? true;
    const normalizedResources =
      input.resources
        ?.map((resource) => resource.trim())
        .filter((resource) => resource.length > 0) ?? [];

    if (normalizedLocationId || (enforceResourceIsolation && normalizedResources.length > 0)) {
      const resourceConflicts = await this.clinicHoldRepository.findActiveOverlapByResources({
        tenantId: input.tenantId,
        clinicId: input.clinicId,
        start,
        end,
        locationId: normalizedLocationId,
        resources: enforceResourceIsolation ? normalizedResources : undefined,
      });

      if (resourceConflicts.length > 0) {
        throw ClinicErrorFactory.holdAlreadyExists(
          'Sala ou recurso já reservado para o período solicitado',
        );
      }
    }

    if (overbookingMetadata) {
      const currentOverbooking =
        metadata.overbooking && typeof metadata.overbooking === 'object'
          ? (metadata.overbooking as Record<string, unknown>)
          : undefined;

      metadata.overbooking = {
        ...(currentOverbooking ?? {}),
        ...overbookingMetadata,
      };
    }

    const hold = await this.clinicHoldRepository.create({
      ...input,
      start,
      end,
      ttlExpiresAt,
      locationId: normalizedLocationId,
      resources: normalizedResources,
      metadata,
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
        overbooking: overbookingMetadata ?? null,
      },
    });

    if (overbookingMetadata?.status === 'pending_review') {
      await this.auditService.register({
        event: 'clinic.overbooking.review_requested',
        clinicId: input.clinicId,
        tenantId: input.tenantId,
        performedBy: input.requestedBy,
        detail: {
          holdId: hold.id,
          riskScore: overbookingMetadata.riskScore,
          threshold: overbookingMetadata.threshold,
          reasons: overbookingMetadata.reasons,
        },
      });
    }

    if (overbookingMetadata) {
      const baseEventPayload = {
        tenantId: input.tenantId,
        clinicId: input.clinicId,
        professionalId: input.professionalId,
        patientId: input.patientId,
        serviceTypeId: input.serviceTypeId,
        riskScore: overbookingMetadata.riskScore,
        threshold: overbookingMetadata.threshold,
        reasons: overbookingMetadata.reasons,
        context: overbookingMetadata.context,
      };

      if (overbookingMetadata.status === 'pending_review') {
        await this.messageBus.publish(
          DomainEvents.clinicOverbookingReviewRequested(hold.id, {
            ...baseEventPayload,
            requestedBy: input.requestedBy,
            requestedAt: now,
            autoApproved: overbookingMetadata.autoApproved ?? false,
          }),
        );
      } else if (overbookingMetadata.status === 'approved') {
        await this.messageBus.publish(
          DomainEvents.clinicOverbookingReviewed(hold.id, {
            ...baseEventPayload,
            reviewedBy: input.requestedBy,
            reviewedAt: now,
            status: 'approved',
            justification: undefined,
            autoApproved: true,
          }),
        );
      }
    }

    return hold;
  }
}

export const CreateClinicHoldUseCaseToken = ICreateClinicHoldUseCaseToken;
