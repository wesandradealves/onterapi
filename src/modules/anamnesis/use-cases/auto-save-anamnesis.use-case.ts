import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import { IAutoSaveAnamnesisUseCase } from '../../../domain/anamnesis/interfaces/use-cases/auto-save-anamnesis.use-case.interface';
import {
  IAnamnesisRepository,
  IAnamnesisRepositoryToken,
} from '../../../domain/anamnesis/interfaces/repositories/anamnesis.repository.interface';
import { Anamnesis, AnamnesisStepKey } from '../../../domain/anamnesis/types/anamnesis.types';
import { ensureCanModifyAnamnesis } from '../utils/anamnesis-permissions.util';
import { AnamnesisErrorFactory } from '../../../shared/factories/anamnesis-error.factory';
import { validateAnamnesisStepPayload } from '../utils/anamnesis-step-validation.util';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';

interface AutoSaveAnamnesisCommand {
  tenantId: string;
  anamnesisId: string;
  stepNumber: number;
  key: AnamnesisStepKey;
  payload: Record<string, unknown>;
  hasErrors?: boolean;
  validationScore?: number;
  autoSavedAt?: Date;
  requesterId: string;
  requesterRole: string;
}

@Injectable()
export class AutoSaveAnamnesisUseCase
  extends BaseUseCase<AutoSaveAnamnesisCommand, Anamnesis>
  implements IAutoSaveAnamnesisUseCase
{
  protected readonly logger = new Logger(AutoSaveAnamnesisUseCase.name);

  constructor(
    @Inject(IAnamnesisRepositoryToken)
    private readonly anamnesisRepository: IAnamnesisRepository,
    private readonly messageBus: MessageBus,
  ) {
    super();
  }

  protected async handle(params: AutoSaveAnamnesisCommand): Promise<Anamnesis> {
    const record = await this.anamnesisRepository.findById(params.tenantId, params.anamnesisId, {
      steps: true,
    });

    if (!record) {
      throw AnamnesisErrorFactory.notFound();
    }

    ensureCanModifyAnamnesis({
      requesterId: params.requesterId,
      requesterRole: params.requesterRole,
      professionalId: record.professionalId,
      patientId: record.patientId,
    });

    if (record.status !== 'draft') {
      throw AnamnesisErrorFactory.invalidState('Apenas anamneses em rascunho podem ser editadas');
    }

    const normalizedPayload = validateAnamnesisStepPayload(params.key, params.payload, 'relaxed');

    const autoSavedAt = params.autoSavedAt ?? new Date();

    const savedStep = await this.anamnesisRepository.autoSaveStep({
      anamnesisId: params.anamnesisId,
      tenantId: params.tenantId,
      stepNumber: params.stepNumber,
      key: params.key,
      payload: normalizedPayload,
      hasErrors: params.hasErrors,
      validationScore: params.validationScore,
      autoSavedAt,
    });

    const updated = await this.anamnesisRepository.findById(params.tenantId, params.anamnesisId, {
      steps: true,
      latestPlan: true,
      attachments: true,
    });

    if (!updated) {
      throw AnamnesisErrorFactory.notFound();
    }

    await this.messageBus.publish(
      DomainEvents.anamnesisStepSaved(
        params.anamnesisId,
        {
          tenantId: params.tenantId,
          stepNumber: params.stepNumber,
          key: params.key,
          completed: savedStep.completed,
          hasErrors: savedStep.hasErrors,
          validationScore: savedStep.validationScore,
          autoSave: true,
          autoSavedAt: savedStep.updatedAt ?? autoSavedAt,
        },
        { userId: params.requesterId, tenantId: params.tenantId },
      ),
    );

    return updated;
  }
}
