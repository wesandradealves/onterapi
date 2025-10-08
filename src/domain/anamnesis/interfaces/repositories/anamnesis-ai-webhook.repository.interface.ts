export const IAnamnesisAIWebhookRepositoryToken = Symbol('IAnamnesisAIWebhookRepository');

export interface RecordAIWebhookRequestInput {
  tenantId?: string | null;
  analysisId?: string | null;
  signature: string;
  receivedAt: Date;
  payloadTimestamp: Date;
}

export interface IAnamnesisAIWebhookRepository {
  recordRequest(input: RecordAIWebhookRequestInput): Promise<boolean>;
  pruneRequests(olderThan: Date): Promise<number>;
}
