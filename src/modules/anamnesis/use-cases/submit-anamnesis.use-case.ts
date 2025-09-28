import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
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
import { Anamnesis } from '../../../domain/anamnesis/types/anamnesis.types';
import { ensureCanModifyAnamnesis } from '../utils/anamnesis-permissions.util';
import { AnamnesisErrorFactory } from '../../../shared/factories/anamnesis-error.factory';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';
import { buildAnamnesisAIRequestPayload } from '../utils/anamnesis-ai.util';

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
      metadata: {
        requesterId: params.requesterId,
        submittedAt: submitted.submittedAt ?? submissionDate,
      },
    });

    const aiPayloadRecord = aiPayload as unknown as Record<string, unknown>;

    const analysis = await this.anamnesisRepository.createAIAnalysis({
      anamnesisId: submitted.id,
      tenantId: params.tenantId,
      payload: aiPayloadRecord,
      status: 'pending',
    });

    await this.messageBus.publishMany([
      DomainEvents.anamnesisSubmitted(
        params.anamnesisId,
        {
          tenantId: params.tenantId,
          completionRate,
          submittedBy: params.requesterId,
          submittedAt: submitted.submittedAt ?? submissionDate,
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
          payload: aiPayloadRecord,
        },
        { userId: params.requesterId, tenantId: params.tenantId },
      ),
    ]);

    return submitted;
  }

  private calculateCompletionRate(record: Anamnesis): number {
    const totalSteps = Math.max(record.totalSteps, 1);
    const completedSteps = (record.steps ?? []).filter((step) => step.completed).length;
    return Math.min(100, Math.round((completedSteps / totalSteps) * 100));
  }
}
