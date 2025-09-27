import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import { IRemoveAnamnesisAttachmentUseCase } from '../../../domain/anamnesis/interfaces/use-cases/remove-anamnesis-attachment.use-case.interface';
import {
  IAnamnesisRepository,
  IAnamnesisRepositoryToken,
} from '../../../domain/anamnesis/interfaces/repositories/anamnesis.repository.interface';
import { ensureCanModifyAnamnesis } from '../utils/anamnesis-permissions.util';
import { AnamnesisErrorFactory } from '../../../shared/factories/anamnesis-error.factory';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';

interface RemoveAttachmentCommand {
  tenantId: string;
  anamnesisId: string;
  attachmentId: string;
  requesterId: string;
  requesterRole: string;
}

@Injectable()
export class RemoveAnamnesisAttachmentUseCase
  extends BaseUseCase<RemoveAttachmentCommand, void>
  implements IRemoveAnamnesisAttachmentUseCase
{
  protected readonly logger = new Logger(RemoveAnamnesisAttachmentUseCase.name);

  constructor(
    @Inject(IAnamnesisRepositoryToken)
    private readonly anamnesisRepository: IAnamnesisRepository,
    private readonly messageBus: MessageBus,
  ) {
    super();
  }

  protected async handle(params: RemoveAttachmentCommand): Promise<void> {
    const record = await this.anamnesisRepository.findById(params.tenantId, params.anamnesisId, {
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

    const hasAttachment = (record.attachments ?? []).some(
      (attachment) => attachment.id === params.attachmentId,
    );

    if (!hasAttachment) {
      throw AnamnesisErrorFactory.invalidState('Anexo informado nao pertence a esta anamnese');
    }

    await this.anamnesisRepository.removeAttachment({
      anamnesisId: params.anamnesisId,
      tenantId: params.tenantId,
      attachmentId: params.attachmentId,
    });

    await this.messageBus.publish(
      DomainEvents.anamnesisAttachmentRemoved(
        params.anamnesisId,
        {
          tenantId: params.tenantId,
          attachmentId: params.attachmentId,
          removedBy: params.requesterId,
        },
        { userId: params.requesterId, tenantId: params.tenantId },
      ),
    );
  }
}
