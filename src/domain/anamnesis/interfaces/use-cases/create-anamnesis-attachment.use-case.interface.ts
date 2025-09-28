import { Result } from '../../../../shared/types/result.type';
import { AnamnesisAttachment } from '../../../anamnesis/types/anamnesis.types';

export interface ICreateAnamnesisAttachmentUseCase {
  execute(params: {
    tenantId: string;
    anamnesisId: string;
    stepNumber?: number;
    fileName: string;
    mimeType: string;
    size: number;
    fileBuffer: Buffer;
    requesterId: string;
    requesterRole: string;
  }): Promise<Result<AnamnesisAttachment>>;
}

export const ICreateAnamnesisAttachmentUseCase = Symbol('ICreateAnamnesisAttachmentUseCase');
