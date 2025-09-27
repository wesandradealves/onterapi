import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import { ISubmitAnamnesisUseCase } from '../../../domain/anamnesis/interfaces/use-cases/submit-anamnesis.use-case.interface';
import {
  IAnamnesisRepository,
  IAnamnesisRepositoryToken,
} from '../../../domain/anamnesis/interfaces/repositories/anamnesis.repository.interface';
import { Anamnesis } from '../../../domain/anamnesis/types/anamnesis.types';
import { ensureCanModifyAnamnesis } from '../utils/anamnesis-permissions.util';
import { AnamnesisErrorFactory } from '../../../shared/factories/anamnesis-error.factory';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';

interface SubmitAnamnesisCommand {
  tenantId: string;
  anamnesisId: string;
  requesterId: string;
  requesterRole: string;
}

@Injectable()
export class SubmitAnamnesisUseCase
  extends BaseUseCase<SubmitAnamnesisCommand, Anamnesis>
  implements ISubmitAnamnesisUseCase
{
  protected readonly logger = new Logger(SubmitAnamnesisUseCase.name);

  constructor(
    @Inject(IAnamnesisRepositoryToken)
    private readonly anamnesisRepository: IAnamnesisRepository,
    private readonly messageBus: MessageBus,
  ) {
    super();
  }

  protected async handle(params: SubmitAnamnesisCommand): Promise<Anamnesis> {
    const record = await this.anamnesisRepository.findById(params.tenantId, params.anamnesisId, {
      steps: true,
      latestPlan: true,
      attachments: true,
    });

    if (!record) {
      throw AnamnesisErrorFactory.notFound();
    }

    ensureCanModifyAnamnesis({
      requesterId: params.requesterId,
      requesterRole: params.requesterRole,
      professionalId: record.professionalId,
    });

    if (record.status !== 'draft') {
      throw AnamnesisErrorFactory.invalidState('A anamnese ja foi submetida anteriormente');
    }

    const completionRate = this.calculateCompletionRate(record);

    const submitted = await this.anamnesisRepository.submit({
      anamnesisId: params.anamnesisId,
      tenantId: params.tenantId,
      submittedBy: params.requesterId,
      submissionDate: new Date(),
      completionRate,
    });

    await this.messageBus.publish(
      DomainEvents.anamnesisSubmitted(
        params.anamnesisId,
        {
          tenantId: params.tenantId,
          completionRate,
          submittedBy: params.requesterId,
          submittedAt: submitted.submittedAt ?? new Date(),
        },
        { userId: params.requesterId, tenantId: params.tenantId },
      ),
    );

    return submitted;
  }

  private calculateCompletionRate(record: Anamnesis): number {
    const totalSteps = Math.max(record.totalSteps, 1);
    const completedSteps = (record.steps ?? []).filter((step) => step.completed).length;
    return Math.min(100, Math.round((completedSteps / totalSteps) * 100));
  }
}
