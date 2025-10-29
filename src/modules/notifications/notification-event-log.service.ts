import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  CreateNotificationEventInput,
  NotificationEvent,
} from '../../domain/notifications/types/notification.types';
import {
  INotificationEventRepository,
  INotificationEventRepository as INotificationEventRepositoryToken,
} from '../../domain/notifications/interfaces/notification-event.repository.interface';

@Injectable()
export class NotificationEventLogService {
  private readonly logger = new Logger(NotificationEventLogService.name);

  constructor(
    @Inject(INotificationEventRepositoryToken)
    private readonly notificationEventRepository: INotificationEventRepository,
  ) {}

  async record(input: CreateNotificationEventInput): Promise<NotificationEvent> {
    try {
      return await this.notificationEventRepository.create(input);
    } catch (error) {
      this.logger.error('Failed to record notification event', error as Error, {
        eventName: input.eventName,
        aggregateId: input.aggregateId,
      });
      throw error;
    }
  }
}
