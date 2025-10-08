import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import { DomainEvent } from '../../../shared/events/domain-event.interface';

import { ISubmitAnamnesisUseCase } from '../../../domain/anamnesis/interfaces/use-cases/submit-anamnesis.use-case.interface';

import {
  IAnamnesisRepository,
  IAnamnesisRepositoryToken,
} from '../../../domain/anamnesis/interfaces/repositories/anamnesis.repository.interface';

import {
  IPatientRepository,
  IPatientRepositoryToken,
} from '../../../domain/patients/interfaces/repositories/patient.repository.interface';

import {
  IAuthRepository,
  IAuthRepositoryToken,
} from '../../../domain/auth/interfaces/repositories/auth.repository.interface';

import {
  Anamnesis,
  AnamnesisCompactSummary,
} from '../../../domain/anamnesis/types/anamnesis.types';

import { ensureCanModifyAnamnesis } from '../utils/anamnesis-permissions.util';

import { AnamnesisErrorFactory } from '../../../shared/factories/anamnesis-error.factory';

import { MessageBus } from '../../../shared/messaging/message-bus';

import { DomainEvents } from '../../../shared/events/domain-events';

import { clonePlain } from '../../../shared/utils/clone.util';
import { buildAnamnesisAIRequestPayload } from '../utils/anamnesis-ai.util';

import { validateAnamnesisStepPayload } from '../utils/anamnesis-step-validation.util';

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

    @Inject(IPatientRepositoryToken)
    private readonly patientRepository: IPatientRepository,

    @Inject(IAuthRepositoryToken)
    private readonly authRepository: IAuthRepository,

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

    for (const step of record.steps ?? []) {
      validateAnamnesisStepPayload(step.key, step.payload, 'strict');
    }

    const completionRate = this.calculateCompletionRate(record);

    const submissionDate = new Date();

    const submitted = await this.anamnesisRepository.submit({
      anamnesisId: params.anamnesisId,

      tenantId: params.tenantId,

      submittedBy: params.requesterId,

      submissionDate,

      completionRate,
    });

    const [patient, professionalEntity] = await Promise.all([
      this.patientRepository.findById(params.tenantId, record.patientId),

      this.authRepository.findById(record.professionalId),
    ]);

    const existingRollup = await this.anamnesisRepository.getPatientRollup(
      params.tenantId,

      record.patientId,
    );

    const compactAnamnesis = this.buildCompactSummary(submitted);

    const patientAge = patient?.birthDate
      ? this.calculatePatientAge(new Date(patient.birthDate))
      : undefined;

    if (submitted.steps) {
      submitted.steps = submitted.steps.map((step) => ({
        ...step,

        payload: validateAnamnesisStepPayload(step.key, step.payload, 'strict', {
          patientAge,
        }),
      }));
    }

    const professionalSnapshot = professionalEntity
      ? {
          id: professionalEntity.id,

          name: professionalEntity.name,

          email: professionalEntity.email,

          role: professionalEntity.role,

          metadata: professionalEntity.metadata ?? undefined,
        }
      : null;

    const aiPayload = buildAnamnesisAIRequestPayload({
      anamnesis: submitted,

      patient: patient ?? undefined,

      professional: professionalSnapshot ?? undefined,

      patientRollup: existingRollup ?? undefined,

      metadata: {
        requesterId: params.requesterId,

        submittedAt: submitted.submittedAt ?? submissionDate,

        compactAnamnesis,
      },
    });

    const aiPayloadRecord = aiPayload as unknown as Record<string, unknown>;

    const analysis = await this.anamnesisRepository.createAIAnalysis({
      anamnesisId: submitted.id,

      tenantId: params.tenantId,

      payload: aiPayloadRecord,

      status: 'pending',
    });

    const events: DomainEvent<unknown>[] = [
      DomainEvents.anamnesisSubmitted(
        params.anamnesisId,
        {
          tenantId: params.tenantId,
          completionRate,
          submittedBy: params.requesterId,
          submittedAt: submitted.submittedAt ?? submissionDate,
          compactAnamnesis,
          patientRollup: existingRollup
            ? {
                summaryText: existingRollup.summaryText,
                summaryVersion: existingRollup.summaryVersion,
                lastAnamnesisId: existingRollup.lastAnamnesisId,
              }
            : null,
        },
        { userId: params.requesterId, tenantId: params.tenantId },
      ),
      DomainEvents.anamnesisAIRequested(
        submitted.id,
        {
          tenantId: params.tenantId,
          analysisId: analysis.id,
          consultationId: submitted.consultationId,
          patientId: submitted.patientId,
          professionalId: submitted.professionalId,
          payload: aiPayload,
        },
        { userId: params.requesterId, tenantId: params.tenantId },
      ),
    ];

    await this.messageBus.publishMany(events);

    return submitted;
  }

  private buildCompactSummary(anamnesis: Anamnesis): AnamnesisCompactSummary {
    const steps = (anamnesis.steps ?? []).map((step) => ({
      key: step.key,

      completed: step.completed,

      payload: this.cloneRecord(step.payload),
    }));

    const attachments = (anamnesis.attachments ?? []).map((attachment) => ({
      id: attachment.id,

      fileName: attachment.fileName,

      stepNumber: attachment.stepNumber ?? undefined,
    }));

    return {
      id: anamnesis.id,

      tenantId: anamnesis.tenantId,

      consultationId: anamnesis.consultationId,

      patientId: anamnesis.patientId,

      professionalId: anamnesis.professionalId,

      status: anamnesis.status,

      submittedAt: anamnesis.submittedAt ?? undefined,

      completionRate: anamnesis.completionRate,

      steps,

      attachments: attachments.length ? attachments : undefined,
    };
  }

  private cloneRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object') {
      return {};
    }

    try {
      return clonePlain(value) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  private calculateCompletionRate(record: Anamnesis): number {
    const totalSteps = Math.max(record.totalSteps, 1);

    const completedSteps = (record.steps ?? []).filter((step) => step.completed).length;

    return Math.min(100, Math.round((completedSteps / totalSteps) * 100));
  }

  private calculatePatientAge(birthDate?: Date): number | undefined {
    if (!birthDate) {
      return undefined;
    }

    const now = new Date();

    let age = now.getFullYear() - birthDate.getFullYear();

    const monthDelta = now.getMonth() - birthDate.getMonth();

    if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birthDate.getDate())) {
      age -= 1;
    }

    return age >= 0 ? age : undefined;
  }
}
