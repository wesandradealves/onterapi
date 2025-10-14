import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  CreateNotificationEventInput,
  ListNotificationEventsInput,
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

  async findAll(
    filters: ListNotificationEventsInput,
  ): Promise<{ data: NotificationEvent[]; total: number }> {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? Math.min(filters.limit, 100) : 20;
    const skip = (page - 1) * limit;

    const query = this.repository.createQueryBuilder('event').orderBy('event.queued_at', 'DESC');

    if (filters.eventName) {
      query.andWhere('event.event_name = :eventName', { eventName: filters.eventName });
    }

    if (filters.status) {
      query.andWhere('event.status = :status', { status: filters.status });
    }

    if (filters.from) {
      query.andWhere('event.queued_at >= :from', { from: filters.from });
    }

    if (filters.to) {
      query.andWhere('event.queued_at <= :to', { to: filters.to });
    }

    const [entities, total] = await query.skip(skip).take(limit).getManyAndCount();

    return {
      data: entities.map((item) => this.toDomain(item)),
      total,
    };
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
