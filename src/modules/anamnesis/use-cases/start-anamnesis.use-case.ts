import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import { IStartAnamnesisUseCase } from '../../../domain/anamnesis/interfaces/use-cases/start-anamnesis.use-case.interface';
import {
  IAnamnesisRepository,
  IAnamnesisRepositoryToken,
} from '../../../domain/anamnesis/interfaces/repositories/anamnesis.repository.interface';
import { Anamnesis, AnamnesisFormData } from '../../../domain/anamnesis/types/anamnesis.types';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';
import { ensureCanModifyAnamnesis } from '../utils/anamnesis-permissions.util';

interface StartAnamnesisCommand {
  tenantId: string;
  consultationId: string;
  patientId: string;
  professionalId: string;
  totalSteps: number;
  initialStep?: number;
  formData?: Partial<AnamnesisFormData>;
  requesterId: string;
  requesterRole: string;
}

const DEFAULT_TOTAL_STEPS = 10;

@Injectable()
export class StartAnamnesisUseCase
  extends BaseUseCase<StartAnamnesisCommand, Anamnesis>
  implements IStartAnamnesisUseCase
{
  protected readonly logger = new Logger(StartAnamnesisUseCase.name);

  constructor(
    @Inject(IAnamnesisRepositoryToken)
    private readonly anamnesisRepository: IAnamnesisRepository,
    private readonly messageBus: MessageBus,
  ) {
    super();
  }

  protected async handle(params: StartAnamnesisCommand): Promise<Anamnesis> {
    ensureCanModifyAnamnesis({
      requesterId: params.requesterId,
      requesterRole: params.requesterRole,
      professionalId: params.professionalId,
    });

    const existing = await this.anamnesisRepository.findByConsultation(
      params.tenantId,
      params.consultationId,
      {
        steps: true,
        latestPlan: true,
        attachments: true,
      },
    );

    if (existing) {
      return existing;
    }

    const totalSteps = params.totalSteps > 0 ? params.totalSteps : DEFAULT_TOTAL_STEPS;

    const created = await this.anamnesisRepository.create({
      tenantId: params.tenantId,
      consultationId: params.consultationId,
      patientId: params.patientId,
      professionalId: params.professionalId,
      totalSteps,
      initialStep: params.initialStep,
      formData: params.formData,
    });

    await this.messageBus.publish(
      DomainEvents.anamnesisCreated(
        created.id,
        {
          tenantId: created.tenantId,
          consultationId: created.consultationId,
          patientId: created.patientId,
          professionalId: created.professionalId,
          requestedBy: params.requesterId,
        },
        { userId: params.requesterId, tenantId: params.tenantId },
      ),
    );

    return created;
  }
}
