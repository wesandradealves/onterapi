import { NotificationEvent } from '../../../../domain/notifications/types/notification.types';
import {
  NotificationEventDto,
  NotificationEventListResponseDto,
} from '../dtos/notification-event-response.dto';

export class NotificationEventPresenter {
  static toDto(event: NotificationEvent): NotificationEventDto {
    return {
      id: event.id,
      eventName: event.eventName,
      aggregateId: event.aggregateId,
      payload: event.payload,
      recipients: event.recipients,
      channels: event.channels,
      status: event.status,
      queuedAt: event.queuedAt.toISOString(),
      processedAt: event.processedAt ? event.processedAt.toISOString() : undefined,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    };
  }

  static list(
    events: NotificationEvent[],
    total: number,
    page: number,
    limit: number,
  ): NotificationEventListResponseDto {
    return {
      data: events.map((event) => this.toDto(event)),
      total,
      page,
      limit,
    };
  }
}
