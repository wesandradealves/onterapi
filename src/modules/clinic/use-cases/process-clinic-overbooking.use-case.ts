import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import {
  type IClinicHoldRepository,
  IClinicHoldRepository as IClinicHoldRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-hold.repository.interface';
import {
  type IProcessClinicOverbookingUseCase,
  IProcessClinicOverbookingUseCase as IProcessClinicOverbookingUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/process-clinic-overbooking.use-case.interface';
import {
  ClinicHold,
  ClinicOverbookingReviewInput,
} from '../../../domain/clinic/types/clinic.types';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';
import { ClinicAuditService } from '../../../infrastructure/clinic/services/clinic-audit.service';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';

type OverbookingMetadata = Record<string, unknown> & {
  status?: string;
  riskScore?: number;
  threshold?: number;
  evaluatedAt?: string;
  reasons?: unknown;
  context?: unknown;
};

const normalizeReasons = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  return value
    .map((item) => (typeof item === 'string' ? item : undefined))
    .filter((item): item is string => typeof item === 'string');
};

const normalizeContext = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
};

@Injectable()
export class ProcessClinicOverbookingUseCase
  extends BaseUseCase<ClinicOverbookingReviewInput, ClinicHold>
  implements IProcessClinicOverbookingUseCase
{
  protected readonly logger = new Logger(ProcessClinicOverbookingUseCase.name);

  constructor(
    @Inject(IClinicHoldRepositoryToken)
    private readonly clinicHoldRepository: IClinicHoldRepository,
    private readonly auditService: ClinicAuditService,
    private readonly messageBus: MessageBus,
  ) {
    super();
  }

  protected async handle(input: ClinicOverbookingReviewInput): Promise<ClinicHold> {
    const hold = await this.clinicHoldRepository.findById(input.holdId);

    if (!hold || hold.clinicId !== input.clinicId || hold.tenantId !== input.tenantId) {
      throw ClinicErrorFactory.holdNotFound('Hold nao encontrado para revisao de overbooking');
    }

    const metadata = this.cloneMetadata(hold.metadata);
    const overbooking = this.extractOverbooking(metadata);

    if (!overbooking) {
      throw ClinicErrorFactory.overbookingReviewNotAllowed(
        'Hold nao possui solicitacao de overbooking pendente',
      );
    }

    const status = typeof overbooking.status === 'string' ? overbooking.status : 'pending_review';
    if (status !== 'pending_review') {
      throw ClinicErrorFactory.overbookingReviewNotAllowed(
        'Solicitacao de overbooking ja processada',
      );
    }

    const reviewedAt = new Date().toISOString();

    if (input.approve) {
      const updated = await this.clinicHoldRepository.updateMetadata({
        holdId: hold.id,
        metadata: {
          ...metadata,
          overbooking: {
            ...overbooking,
            status: 'approved',
            reviewedBy: input.performedBy,
            reviewedAt,
            justification: input.justification,
            requiresManualApproval: false,
          },
        },
      });

      await this.auditService.register({
        event: 'clinic.overbooking.approved',
        clinicId: input.clinicId,
        tenantId: input.tenantId,
        performedBy: input.performedBy,
        detail: {
          holdId: hold.id,
          riskScore: overbooking.riskScore ?? null,
          justification: input.justification ?? null,
        },
      });

      const eventPayload = {
        tenantId: input.tenantId,
        clinicId: input.clinicId,
        professionalId: hold.professionalId,
        patientId: hold.patientId,
        serviceTypeId: hold.serviceTypeId,
        riskScore: overbooking.riskScore ?? 0,
        threshold: overbooking.threshold ?? 0,
        reasons: normalizeReasons(overbooking.reasons),
        context: normalizeContext(overbooking.context),
      };

      await this.messageBus.publish(
        DomainEvents.clinicOverbookingReviewed(hold.id, {
          ...eventPayload,
          reviewedBy: input.performedBy,
          reviewedAt: new Date(reviewedAt),
          status: 'approved',
          justification: input.justification,
          autoApproved: false,
        }),
      );

      return updated;
    }

    const rejectedMetadata = {
      ...metadata,
      overbooking: {
        ...overbooking,
        status: 'rejected',
        reviewedBy: input.performedBy,
        reviewedAt,
        justification: input.justification,
        requiresManualApproval: false,
      },
    };

    await this.clinicHoldRepository.updateMetadata({
      holdId: hold.id,
      metadata: rejectedMetadata,
    });

    const cancelled = await this.clinicHoldRepository.cancelHold({
      holdId: hold.id,
      cancelledBy: input.performedBy,
      reason: input.justification ?? 'overbooking_rejected',
    });

    await this.auditService.register({
      event: 'clinic.overbooking.rejected',
      clinicId: input.clinicId,
      tenantId: input.tenantId,
      performedBy: input.performedBy,
      detail: {
        holdId: hold.id,
        riskScore: overbooking.riskScore ?? null,
        justification: input.justification ?? null,
      },
    });

    const eventPayload = {
      tenantId: input.tenantId,
      clinicId: input.clinicId,
      professionalId: hold.professionalId,
      patientId: hold.patientId,
      serviceTypeId: hold.serviceTypeId,
      riskScore: overbooking.riskScore ?? 0,
      threshold: overbooking.threshold ?? 0,
      reasons: normalizeReasons(overbooking.reasons),
      context: normalizeContext(overbooking.context),
    };

    await this.messageBus.publish(
      DomainEvents.clinicOverbookingReviewed(hold.id, {
        ...eventPayload,
        reviewedBy: input.performedBy,
        reviewedAt: new Date(reviewedAt),
        status: 'rejected',
        justification: input.justification,
        autoApproved: false,
      }),
    );

    return {
      ...cancelled,
      metadata: rejectedMetadata,
    };
  }

  private cloneMetadata(
    metadata?: Record<string, unknown>,
  ): Record<string, unknown> & { overbooking?: OverbookingMetadata } {
    if (!metadata || typeof metadata !== 'object') {
      return {};
    }

    return JSON.parse(JSON.stringify(metadata)) as Record<string, unknown> & {
      overbooking?: OverbookingMetadata;
    };
  }

  private extractOverbooking(
    metadata: Record<string, unknown> & { overbooking?: OverbookingMetadata },
  ): OverbookingMetadata | undefined {
    const raw = metadata.overbooking;
    if (!raw || typeof raw !== 'object') {
      return undefined;
    }

    return raw as OverbookingMetadata;
  }
}

export const ProcessClinicOverbookingUseCaseToken = IProcessClinicOverbookingUseCaseToken;
