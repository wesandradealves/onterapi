import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import { ISaveTherapeuticPlanUseCase } from '../../../domain/anamnesis/interfaces/use-cases/save-therapeutic-plan.use-case.interface';
import {
  IAnamnesisRepository,
  IAnamnesisRepositoryToken,
} from '../../../domain/anamnesis/interfaces/repositories/anamnesis.repository.interface';
import { TherapeuticPlanData } from '../../../domain/anamnesis/types/anamnesis.types';
import { ensureCanModifyAnamnesis } from '../utils/anamnesis-permissions.util';
import { AnamnesisErrorFactory } from '../../../shared/factories/anamnesis-error.factory';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';

interface SaveTherapeuticPlanCommand {
  tenantId: string;
  anamnesisId: string;
  clinicalReasoning?: string;
  summary?: string;
  therapeuticPlan?: Record<string, unknown>;
  riskFactors?: TherapeuticPlanData['riskFactors'];
  recommendations?: TherapeuticPlanData['recommendations'];
  confidence?: number;
  reviewRequired?: boolean;
  generatedAt: Date;
  requesterId: string;
  requesterRole: string;
}

@Injectable()
export class SaveTherapeuticPlanUseCase
  extends BaseUseCase<SaveTherapeuticPlanCommand, TherapeuticPlanData>
  implements ISaveTherapeuticPlanUseCase
{
  protected readonly logger = new Logger(SaveTherapeuticPlanUseCase.name);

  constructor(
    @Inject(IAnamnesisRepositoryToken)
    private readonly anamnesisRepository: IAnamnesisRepository,
    private readonly messageBus: MessageBus,
  ) {
    super();
  }

  protected async handle(params: SaveTherapeuticPlanCommand): Promise<TherapeuticPlanData> {
    const record = await this.anamnesisRepository.findById(params.tenantId, params.anamnesisId);

    if (!record) {
      throw AnamnesisErrorFactory.notFound();
    }

    ensureCanModifyAnamnesis({
      requesterId: params.requesterId,
      requesterRole: params.requesterRole,
      professionalId: record.professionalId,
    });

    const plan = await this.anamnesisRepository.saveTherapeuticPlan({
      anamnesisId: params.anamnesisId,
      tenantId: params.tenantId,
      clinicalReasoning: params.clinicalReasoning,
      summary: params.summary,
      therapeuticPlan: params.therapeuticPlan,
      riskFactors: params.riskFactors,
      recommendations: params.recommendations,
      confidence: params.confidence,
      reviewRequired: params.reviewRequired,
      generatedAt: params.generatedAt,
    });

    await this.messageBus.publish(
      DomainEvents.therapeuticPlanGenerated(
        params.anamnesisId,
        {
          tenantId: params.tenantId,
          generatedAt: plan.generatedAt,
          confidence: plan.confidence,
          reviewRequired: plan.reviewRequired,
        },
        { userId: params.requesterId, tenantId: params.tenantId },
      ),
    );

    return plan;
  }
}
