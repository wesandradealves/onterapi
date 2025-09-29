import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import { ISaveAnamnesisStepUseCase } from '../../../domain/anamnesis/interfaces/use-cases/save-anamnesis-step.use-case.interface';
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

interface SaveAnamnesisStepCommand {
  tenantId: string;
  anamnesisId: string;
  stepNumber: number;
  key: AnamnesisStepKey;
  payload: Record<string, unknown>;
  completed?: boolean;
  hasErrors?: boolean;
  validationScore?: number;
  requesterId: string;
  requesterRole: string;
}

@Injectable()
export class SaveAnamnesisStepUseCase
  extends BaseUseCase<SaveAnamnesisStepCommand, Anamnesis>
  implements ISaveAnamnesisStepUseCase
{
  protected readonly logger = new Logger(SaveAnamnesisStepUseCase.name);

  constructor(
    @Inject(IAnamnesisRepositoryToken)
    private readonly anamnesisRepository: IAnamnesisRepository,
    private readonly messageBus: MessageBus,
  ) {
    super();
  }

  protected async handle(params: SaveAnamnesisStepCommand): Promise<Anamnesis> {
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

    const validationMode = params.completed ? 'strict' : 'relaxed';
    const normalizedPayload = validateAnamnesisStepPayload(
      params.key,
      params.payload,
      validationMode,
    );

    const { completionRate, currentStep, stepCompleted } = this.computeProgressMetrics(
      record,
      params,
    );

    await this.anamnesisRepository.saveStep({
      anamnesisId: params.anamnesisId,
      tenantId: params.tenantId,
      stepNumber: params.stepNumber,
      key: params.key,
      payload: normalizedPayload,
      completed: params.completed,
      hasErrors: params.hasErrors,
      validationScore: params.validationScore,
      updatedBy: params.requesterId,
      currentStep,
      completionRate,
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
          completed: stepCompleted,
          completionRate,
          currentStep,
          hasErrors: params.hasErrors ?? false,
          validationScore: params.validationScore,
          updatedBy: params.requesterId,
        },
        { userId: params.requesterId, tenantId: params.tenantId },
      ),
    );

    return updated;
  }

  private computeProgressMetrics(
    record: Anamnesis,
    params: SaveAnamnesisStepCommand,
  ): {
    completionRate: number;
    currentStep: number;
    stepCompleted: boolean;
  } {
    const totalSteps = Math.max(record.totalSteps, 1);
    const stepsMap = new Map<number, boolean>();

    (record.steps ?? []).forEach((step) => {
      stepsMap.set(step.stepNumber, step.completed);
    });

    const previousCompleted = stepsMap.get(params.stepNumber) ?? false;
    const stepCompleted = params.completed ?? previousCompleted;
    stepsMap.set(params.stepNumber, stepCompleted);

    const completedCount = Array.from(stepsMap.values()).filter(Boolean).length;
    const completionRate = Math.min(100, Math.round((completedCount / totalSteps) * 100));

    const currentStep = this.determineCurrentStep(
      stepsMap,
      totalSteps,
      params.stepNumber,
      stepCompleted,
    );

    return { completionRate, currentStep, stepCompleted };
  }

  private determineCurrentStep(
    stepsMap: Map<number, boolean>,
    totalSteps: number,
    updatedStepNumber: number,
    stepCompleted: boolean,
  ): number {
    if (!stepCompleted) {
      return Math.max(updatedStepNumber, 1);
    }

    for (let index = 1; index <= totalSteps; index += 1) {
      const completed = stepsMap.get(index);
      if (!completed) {
        return index;
      }
    }

    return totalSteps;
  }
}
