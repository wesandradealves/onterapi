import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import { ISavePlanFeedbackUseCase } from '../../../domain/anamnesis/interfaces/use-cases/save-plan-feedback.use-case.interface';
import {
  IAnamnesisRepository,
  IAnamnesisRepositoryToken,
} from '../../../domain/anamnesis/interfaces/repositories/anamnesis.repository.interface';
import { TherapeuticPlanData } from '../../../domain/anamnesis/types/anamnesis.types';
import { ensureCanModifyAnamnesis } from '../utils/anamnesis-permissions.util';
import { AnamnesisErrorFactory } from '../../../shared/factories/anamnesis-error.factory';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';

interface SavePlanFeedbackCommand {
  tenantId: string;
  anamnesisId: string;
  approvalStatus: 'approved' | 'modified' | 'rejected';
  liked?: boolean;
  feedbackComment?: string;
  requesterId: string;
  requesterRole: string;
}

@Injectable()
export class SavePlanFeedbackUseCase
  extends BaseUseCase<SavePlanFeedbackCommand, TherapeuticPlanData>
  implements ISavePlanFeedbackUseCase
{
  protected readonly logger = new Logger(SavePlanFeedbackUseCase.name);

  constructor(
    @Inject(IAnamnesisRepositoryToken)
    private readonly anamnesisRepository: IAnamnesisRepository,
    private readonly messageBus: MessageBus,
  ) {
    super();
  }

  protected async handle(params: SavePlanFeedbackCommand): Promise<TherapeuticPlanData> {
    const record = await this.anamnesisRepository.findById(params.tenantId, params.anamnesisId);

    if (!record) {
      throw AnamnesisErrorFactory.notFound();
    }

    ensureCanModifyAnamnesis({
      requesterId: params.requesterId,
      requesterRole: params.requesterRole,
      professionalId: record.professionalId,
    });

    let plan: TherapeuticPlanData;

    try {
      plan = await this.anamnesisRepository.savePlanFeedback({
        anamnesisId: params.anamnesisId,
        tenantId: params.tenantId,
        approvalStatus: params.approvalStatus,
        liked: params.liked,
        feedbackComment: params.feedbackComment,
        feedbackGivenBy: params.requesterId,
        feedbackGivenAt: new Date(),
      });
    } catch (error) {
      throw AnamnesisErrorFactory.invalidState('Plano terapeutico nao encontrado');
    }

    await this.messageBus.publish(
      DomainEvents.therapeuticPlanFeedbackSaved(
        params.anamnesisId,
        {
          tenantId: params.tenantId,
          approvalStatus: params.approvalStatus,
          liked: params.liked,
          feedbackGivenBy: params.requesterId,
          feedbackGivenAt: plan.feedbackGivenAt ?? new Date(),
        },
        { userId: params.requesterId, tenantId: params.tenantId },
      ),
    );

    return plan;
  }
}
