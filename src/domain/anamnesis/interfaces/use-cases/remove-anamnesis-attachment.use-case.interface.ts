import { Result } from '../../../../shared/types/result.type';

export interface IRemoveAnamnesisAttachmentUseCase {
  execute(params: {
    tenantId: string;
    anamnesisId: string;
    attachmentId: string;
    requesterId: string;
    requesterRole: string;
  }): Promise<Result<void>>;
}

export const IRemoveAnamnesisAttachmentUseCase = Symbol('IRemoveAnamnesisAttachmentUseCase');
