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
  type IClinicProfessionalPolicyRepository,
  IClinicProfessionalPolicyRepository as IClinicProfessionalPolicyRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-professional-policy.repository.interface';
import {
  type IClinicProfessionalCoverageRepository,
  IClinicProfessionalCoverageRepository as IClinicProfessionalCoverageRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-professional-coverage.repository.interface';
import {
  IExternalCalendarEventsRepository,
  IExternalCalendarEventsRepositoryToken,
} from '../../../domain/scheduling/interfaces/repositories/external-calendar-events.repository.interface';
import {
  ClinicAppointmentChannel,
  ClinicHold,
  ClinicHoldRequestInput,
  ClinicInvitationChannelScope,
  ClinicProfessionalCoverage,
} from '../../../domain/clinic/types/clinic.types';
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
    @Inject(IClinicProfessionalPolicyRepositoryToken)
    private readonly professionalPolicyRepository: IClinicProfessionalPolicyRepository,
    @Inject(IClinicProfessionalCoverageRepositoryToken)
    private readonly coverageRepository: IClinicProfessionalCoverageRepository,
    @Inject(IExternalCalendarEventsRepositoryToken)
    private readonly externalCalendarEventsRepository: IExternalCalendarEventsRepository,
    private readonly auditService: ClinicAuditService,
    private readonly messageBus: MessageBus,
    private readonly overbookingEvaluator: ClinicOverbookingEvaluatorService,
  ) {
    super();
  }

  protected async handle(input: ClinicHoldRequestInput): Promise<ClinicHold> {
    const clinic = await this.clinicRepository.findByTenant(input.tenantId, input.clinicId);

    if (!clinic) {
      throw ClinicErrorFactory.clinicNotFound('Clinica nao encontrada');
    }

    const channel: ClinicAppointmentChannel = input.channel ?? 'direct';

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
      throw ClinicErrorFactory.serviceTypeNotFound('Tipo de servico nao encontrado');
    }

    const now = new Date();
    const start = new Date(input.start);
    const end = new Date(input.end);

    if (end <= start) {
      throw ClinicErrorFactory.invalidHoldWindow('Horario final deve ser posterior ao inicial');
    }

    if (start <= now) {
      throw ClinicErrorFactory.invalidHoldWindow('Nao e possivel criar holds no passado');
    }

    const diffMinutes = Math.floor((start.getTime() - now.getTime()) / 60000);
    const minAdvance = Math.max(
      clinic.holdSettings?.minAdvanceMinutes ?? 0,
      serviceType.minAdvanceMinutes,
    );

    if (diffMinutes < minAdvance) {
      throw ClinicErrorFactory.invalidHoldWindow(
        'Antecedencia minima para criacao de holds nao respeitada',
      );
    }

    if (serviceType.maxAdvanceMinutes && diffMinutes > serviceType.maxAdvanceMinutes) {
      throw ClinicErrorFactory.invalidHoldWindow('Antecedencia maxima excedida para este servico');
    }

    const ttlMinutes = clinic.holdSettings?.ttlMinutes ?? 30;
    const ttlExpiresAt = new Date(now.getTime() + ttlMinutes * 60000);

    if (ttlExpiresAt >= start) {
      ttlExpiresAt.setTime(start.getTime() - 60 * 1000);
    }

    const { professionalId: resolvedProfessionalId, coverage } =
      await this.resolveProfessionalCoverage({
        tenantId: input.tenantId,
        clinicId: input.clinicId,
        professionalId: input.professionalId,
        startAt: start,
        endAt: end,
      });

    const professionalPolicy = await this.professionalPolicyRepository.findActivePolicy({
      clinicId: input.clinicId,
      tenantId: input.tenantId,
      professionalId: resolvedProfessionalId,
    });

    if (!professionalPolicy) {
      const message =
        resolvedProfessionalId === input.professionalId
          ? 'Politica clinica-profissional nao encontrada para o profissional convidado'
          : 'Profissional de cobertura nao possui politica clinica ativa para o periodo informado';
      throw ClinicErrorFactory.invitationNotFound(message);
    }

    if (!this.isChannelAllowed(professionalPolicy.channelScope, channel)) {
      throw ClinicErrorFactory.invalidClinicData(
        'Politica clinica-profissional nao permite agendamentos pelo canal informado',
      );
    }

    const policyServiceType = professionalPolicy.economicSummary.items.find(
      (item) => item.serviceTypeId === serviceType.id,
    );

    if (!policyServiceType) {
      throw ClinicErrorFactory.invalidClinicData(
        'Politica clinica-profissional nao contempla o tipo de servico selecionado',
      );
    }

    if (
      policyServiceType.price !== serviceType.price ||
      policyServiceType.currency !== serviceType.currency
    ) {
      throw ClinicErrorFactory.invalidClinicData(
        'Politica clinica-profissional divergente dos precos configurados para o servico',
      );
    }

    const overlappingHolds = await this.clinicHoldRepository.findActiveOverlapByProfessional({
      tenantId: input.tenantId,
      professionalId: resolvedProfessionalId,
      start,
      end,
    });

    const externalCalendarConflicts =
      await this.externalCalendarEventsRepository.findApprovedOverlap({
        tenantId: input.tenantId,
        professionalId: resolvedProfessionalId,
        start,
        end,
      });

    if (externalCalendarConflicts.length > 0) {
      throw ClinicErrorFactory.holdAlreadyExists(
        'Profissional ja possui evento externo aprovado para este periodo',
      );
    }

    const allowOverbooking = clinic.holdSettings?.allowOverbooking ?? false;

    const hasConfirmedOverlap = overlappingHolds.some((hold) => hold.status === 'confirmed');

    if (hasConfirmedOverlap) {
      throw ClinicErrorFactory.holdAlreadyExists(
        'Profissional ja possui atendimento confirmado para este periodo',
      );
    }

    if (!allowOverbooking && overlappingHolds.length > 0) {
      throw ClinicErrorFactory.holdAlreadyExists(
        'Ja existe um compromisso ativo para este profissional no periodo solicitado',
      );
    }

    const metadata: Record<string, unknown> =
      input.metadata && typeof input.metadata === 'object' ? { ...input.metadata } : {};

    if (coverage) {
      metadata.coverage = {
        coverageId: coverage.id,
        originalProfessionalId: input.professionalId,
        coverageProfessionalId: coverage.coverageProfessionalId,
        status: coverage.status,
        startAt: coverage.startAt.toISOString(),
        endAt: coverage.endAt.toISOString(),
      };
    }

    let overbookingMetadata: OverbookingMetadata | undefined;

    if (overlappingHolds.length > 0) {
      const evaluation = await this.overbookingEvaluator.evaluate({
        tenantId: input.tenantId,
        clinicId: input.clinicId,
        professionalId: resolvedProfessionalId,
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
          'Sala ou recurso ja reservado para o periodo solicitado',
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

    metadata.channel = channel;
    metadata.professionalPolicy = {
      policyId: professionalPolicy.id,
      channelScope: professionalPolicy.channelScope,
      effectiveAt: professionalPolicy.effectiveAt.toISOString(),
      sourceInvitationId: professionalPolicy.sourceInvitationId,
      acceptedBy: professionalPolicy.acceptedBy,
      economicSummary: JSON.parse(JSON.stringify(professionalPolicy.economicSummary)),
    };

    const hold = await this.clinicHoldRepository.create({
      ...input,
      professionalId: resolvedProfessionalId,
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
        professionalId: resolvedProfessionalId,
        coverage: coverage
          ? {
              coverageId: coverage.id,
              originalProfessionalId: input.professionalId,
              coverageProfessionalId: coverage.coverageProfessionalId,
              status: coverage.status,
              startAt: coverage.startAt.toISOString(),
              endAt: coverage.endAt.toISOString(),
            }
          : null,
        patientId: input.patientId,
        serviceTypeId: input.serviceTypeId,
        start,
        end,
        ttlExpiresAt,
        channel,
        professionalPolicyId: professionalPolicy.id,
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
        professionalId: resolvedProfessionalId,
        originalProfessionalId:
          coverage && coverage.coverageProfessionalId !== input.professionalId
            ? input.professionalId
            : undefined,
        patientId: input.patientId,
        serviceTypeId: input.serviceTypeId,
        professionalPolicyId: professionalPolicy.id,
        channel,
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

  private async resolveProfessionalCoverage(params: {
    tenantId: string;
    clinicId: string;
    professionalId: string;
    startAt: Date;
    endAt: Date;
  }): Promise<{ professionalId: string; coverage?: ClinicProfessionalCoverage }> {
    const coverages = await this.coverageRepository.findActiveOverlapping({
      tenantId: params.tenantId,
      clinicId: params.clinicId,
      professionalId: params.professionalId,
      startAt: params.startAt,
      endAt: params.endAt,
    });

    if (!coverages || coverages.length === 0) {
      return { professionalId: params.professionalId };
    }

    const [selected] = [...coverages].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

    if (
      !selected ||
      !selected.coverageProfessionalId ||
      selected.coverageProfessionalId === params.professionalId
    ) {
      return { professionalId: params.professionalId };
    }

    this.logger.debug('Cobertura temporaria aplicada ao hold', {
      clinicId: params.clinicId,
      tenantId: params.tenantId,
      professionalId: params.professionalId,
      coverageProfessionalId: selected.coverageProfessionalId,
      coverageId: selected.id,
    });

    return {
      professionalId: selected.coverageProfessionalId,
      coverage: selected,
    };
  }

  private isChannelAllowed(
    scope: ClinicInvitationChannelScope,
    channel: ClinicAppointmentChannel,
  ): boolean {
    if (scope === 'both') {
      return true;
    }
    return scope === channel;
  }
}

export const CreateClinicHoldUseCaseToken = ICreateClinicHoldUseCaseToken;
