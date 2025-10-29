import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import { ICreateAnamnesisAttachmentUseCase } from '../../../domain/anamnesis/interfaces/use-cases/create-anamnesis-attachment.use-case.interface';
import {
  IAnamnesisRepository,
  IAnamnesisRepositoryToken,
} from '../../../domain/anamnesis/interfaces/repositories/anamnesis.repository.interface';
import { AnamnesisAttachment } from '../../../domain/anamnesis/types/anamnesis.types';
import { ensureCanModifyAnamnesis } from '../utils/anamnesis-permissions.util';
import { AnamnesisErrorFactory } from '../../../shared/factories/anamnesis-error.factory';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';
import {
  IAnamnesisAttachmentStorageService,
  IAnamnesisAttachmentStorageServiceToken,
} from '../../../domain/anamnesis/interfaces/services/anamnesis-attachment-storage.service.interface';

interface CreateAttachmentCommand {
  tenantId: string;
  anamnesisId: string;
  stepNumber?: number;
  fileName: string;
  mimeType: string;
  size: number;
  fileBuffer: Buffer;
  requesterId: string;
  requesterRole: string;
}

@Injectable()
export class CreateAnamnesisAttachmentUseCase
  extends BaseUseCase<CreateAttachmentCommand, AnamnesisAttachment>
  implements ICreateAnamnesisAttachmentUseCase
{
  protected readonly logger = new Logger(CreateAnamnesisAttachmentUseCase.name);

  constructor(
    @Inject(IAnamnesisRepositoryToken)
    private readonly anamnesisRepository: IAnamnesisRepository,
    @Inject(IAnamnesisAttachmentStorageServiceToken)
    private readonly attachmentStorage: IAnamnesisAttachmentStorageService,
    private readonly messageBus: MessageBus,
  ) {
    super();
  }

  protected async handle(params: CreateAttachmentCommand): Promise<AnamnesisAttachment> {
    const record = await this.anamnesisRepository.findById(params.tenantId, params.anamnesisId);

    if (!record) {
      throw AnamnesisErrorFactory.notFound();
    }

    ensureCanModifyAnamnesis({
      requesterId: params.requesterId,
      requesterRole: params.requesterRole,
      professionalId: record.professionalId,
      patientId: record.patientId,
    });

    if (params.size !== params.fileBuffer.byteLength) {
      this.logger.warn(
        `Tamanho informado (${params.size}) difere do buffer (${params.fileBuffer.byteLength}) para anamnese ${params.anamnesisId}`,
      );
    }

    let uploadResult;

    try {
      uploadResult = await this.attachmentStorage.upload({
        tenantId: params.tenantId,
        anamnesisId: params.anamnesisId,
        fileName: params.fileName,
        mimeType: params.mimeType,
        buffer: params.fileBuffer,
      });
    } catch (error) {
      this.logger.error('Falha ao salvar anexo no storage', error as Error);
      throw AnamnesisErrorFactory.invalidState('Nao foi possivel salvar o anexo no storage');
    }

    const attachment = await this.anamnesisRepository.createAttachment({
      anamnesisId: params.anamnesisId,
      tenantId: params.tenantId,
      stepNumber: params.stepNumber,
      fileName: params.fileName,
      mimeType: params.mimeType,
      size: uploadResult.size,
      storagePath: uploadResult.storagePath,
      uploadedBy: params.requesterId,
    });

    await this.messageBus.publish(
      DomainEvents.anamnesisAttachmentCreated(
        params.anamnesisId,
        {
          tenantId: params.tenantId,
          attachmentId: attachment.id,
          stepNumber: attachment.stepNumber,
          uploadedBy: params.requesterId,
        },
        { userId: params.requesterId, tenantId: params.tenantId },
      ),
    );

    return attachment;
  }
}
