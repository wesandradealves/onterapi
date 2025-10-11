import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import { ICancelAnamnesisUseCase } from '../../../domain/anamnesis/interfaces/use-cases/cancel-anamnesis.use-case.interface';
import {
  IAnamnesisRepository,
  IAnamnesisRepositoryToken,
} from '../../../domain/anamnesis/interfaces/repositories/anamnesis.repository.interface';
import { CancelAnamnesisInput } from '../../../domain/anamnesis/types/anamnesis.types';
import { ensureCanModifyAnamnesis } from '../utils/anamnesis-permissions.util';
import { AnamnesisErrorFactory } from '../../../shared/factories/anamnesis-error.factory';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';

@Injectable()
export class CancelAnamnesisUseCase
  extends BaseUseCase<CancelAnamnesisInput, void>
  implements ICancelAnamnesisUseCase
{
  protected readonly logger = new Logger(CancelAnamnesisUseCase.name);

  constructor(
    @Inject(IAnamnesisRepositoryToken)
    private readonly anamnesisRepository: IAnamnesisRepository,
    private readonly messageBus: MessageBus,
  ) {
    super();
  }

  protected async handle(input: CancelAnamnesisInput): Promise<void> {
    const record = await this.anamnesisRepository.findById(input.tenantId, input.anamnesisId);

    if (!record) {
      throw AnamnesisErrorFactory.notFound();
    }

    if (record.deletedAt || record.status === 'cancelled') {
      throw AnamnesisErrorFactory.invalidState('Anamnese ja foi cancelada anteriormente');
    }

    ensureCanModifyAnamnesis({
      requesterId: input.requestedBy,
      requesterRole: input.requesterRole,
      professionalId: record.professionalId,
      patientId: record.patientId,
    });

    const reason =
      typeof input.reason === 'string' && input.reason.trim().length > 0
        ? input.reason.trim()
        : undefined;

    await this.anamnesisRepository.cancel({
      ...input,
      reason,
    });

    const event = DomainEvents.anamnesisCancelled(
      input.anamnesisId,
      {
        tenantId: input.tenantId,
        reason,
        cancelledBy: input.requestedBy,
      },
      { userId: input.requestedBy, tenantId: input.tenantId },
    );

    await this.messageBus.publish(event);

    this.logger.log('Anamnese cancelada', {
      anamnesisId: input.anamnesisId,
      tenantId: input.tenantId,
      requestedBy: input.requestedBy,
    });
  }
}
