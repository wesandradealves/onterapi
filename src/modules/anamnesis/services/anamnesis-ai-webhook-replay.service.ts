import { Inject, Injectable } from '@nestjs/common';

import {
  IAnamnesisAIWebhookRepository,
  IAnamnesisAIWebhookRepositoryToken,
} from '../../../domain/anamnesis/interfaces/repositories/anamnesis-ai-webhook.repository.interface';

export interface RegisterWebhookRequestInput {
  tenantId?: string | null;
  analysisId?: string | null;
  signature: string;
  payloadTimestamp: Date;
  receivedAt: Date;
}

@Injectable()
export class AnamnesisAIWebhookReplayService {
  constructor(
    @Inject(IAnamnesisAIWebhookRepositoryToken)
    private readonly webhookRepository: IAnamnesisAIWebhookRepository,
  ) {}

  async registerRequest(input: RegisterWebhookRequestInput): Promise<boolean> {
    return this.webhookRepository.recordRequest({
      tenantId: input.tenantId ?? null,
      analysisId: input.analysisId ?? null,
      signature: input.signature,
      payloadTimestamp: input.payloadTimestamp,
      receivedAt: input.receivedAt,
    });
  }

  async pruneBefore(date: Date): Promise<number> {
    return this.webhookRepository.pruneRequests(date);
  }
}
