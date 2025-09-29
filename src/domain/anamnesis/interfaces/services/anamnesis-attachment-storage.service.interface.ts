export interface UploadAnamnesisAttachmentInput {
  tenantId: string;
  anamnesisId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}

export interface UploadAnamnesisAttachmentResult {
  storagePath: string;
  size: number;
}

export interface DeleteAnamnesisAttachmentInput {
  storagePath: string;
}

export interface IAnamnesisAttachmentStorageService {
  upload(input: UploadAnamnesisAttachmentInput): Promise<UploadAnamnesisAttachmentResult>;
  delete(input: DeleteAnamnesisAttachmentInput): Promise<void>;
}

export const IAnamnesisAttachmentStorageServiceToken = Symbol('IAnamnesisAttachmentStorageService');
