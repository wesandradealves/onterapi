import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import {
  IAnamnesisAIWebhookRepository,
  RecordAIWebhookRequestInput,
} from '../../../domain/anamnesis/interfaces/repositories/anamnesis-ai-webhook.repository.interface';
import { AnamnesisAIWebhookRequestEntity } from '../entities/anamnesis-ai-webhook-request.entity';

@Injectable()
export class AnamnesisAIWebhookRepository implements IAnamnesisAIWebhookRepository {
  private readonly repository: Repository<AnamnesisAIWebhookRequestEntity>;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    this.repository = this.dataSource.getRepository(AnamnesisAIWebhookRequestEntity);
  }

  async recordRequest(input: RecordAIWebhookRequestInput): Promise<boolean> {
    const entity = this.repository.create({
      tenantId: input.tenantId ?? null,
      analysisId: input.analysisId ?? null,
      signatureHash: input.signature,
      payloadTimestamp: input.payloadTimestamp,
      receivedAt: input.receivedAt,
    });

    try {
      await this.repository.insert(entity);
      return true;
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        return false;
      }
      throw error;
    }
  }

  async pruneRequests(olderThan: Date): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .from(AnamnesisAIWebhookRequestEntity)
      .where('payload_timestamp < :olderThan', { olderThan })
      .execute();

    return result.affected ?? 0;
  }

  private isUniqueViolation(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const code = (error as { code?: string }).code;
    const driverCode = (error as { driverError?: { code?: string } }).driverError?.code;

    return code === '23505' || driverCode === '23505';
  }
}
