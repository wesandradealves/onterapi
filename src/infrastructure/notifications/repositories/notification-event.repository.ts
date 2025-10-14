import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  CreateNotificationEventInput,
  NotificationEvent,
  UpdateNotificationEventStatusInput,
} from '../../../domain/notifications/types/notification.types';
import {
  INotificationEventRepository,
  INotificationEventRepository as INotificationEventRepositoryToken,
} from '../../../domain/notifications/interfaces/notification-event.repository.interface';
import { NotificationEventEntity } from '../entities/notification-event.entity';

@Injectable()
export class NotificationEventRepository implements INotificationEventRepository {
  constructor(
    @InjectRepository(NotificationEventEntity)
    private readonly repository: Repository<NotificationEventEntity>,
  ) {}

  async create(input: CreateNotificationEventInput): Promise<NotificationEvent> {
    const entity = this.repository.create({
      eventName: input.eventName,
      aggregateId: input.aggregateId,
      payload: input.payload,
      recipients: input.recipients,
      channels: input.channels,
      queuedAt: input.queuedAt,
      status: input.status ?? 'queued',
    });

    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async updateStatus(input: UpdateNotificationEventStatusInput): Promise<void> {
    await this.repository.query(
      `UPDATE notification_events
       SET status = $1,
           processed_at = $2,
           error_detail = $3,
           updated_at = NOW()
       WHERE id = $4`,
      [input.status, input.processedAt ?? new Date(), input.errorDetail ?? null, input.id],
    );
  }

  private toDomain(entity: NotificationEventEntity): NotificationEvent {
    return {
      id: entity.id,
      eventName: entity.eventName,
      aggregateId: entity.aggregateId,
      payload: entity.payload,
      recipients: entity.recipients,
      channels: entity.channels,
      status: entity.status,
      queuedAt: entity.queuedAt,
      processedAt: entity.processedAt ?? undefined,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}

export const NotificationEventRepositoryToken = INotificationEventRepositoryToken;
