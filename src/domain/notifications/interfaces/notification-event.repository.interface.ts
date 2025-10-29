import {
  CreateNotificationEventInput,
  ListNotificationEventsInput,
  NotificationEvent,
  UpdateNotificationEventStatusInput,
} from '../../notifications/types/notification.types';

export interface INotificationEventRepository {
  create(input: CreateNotificationEventInput): Promise<NotificationEvent>;
  updateStatus(input: UpdateNotificationEventStatusInput): Promise<void>;
  findAll(
    filters: ListNotificationEventsInput,
  ): Promise<{ data: NotificationEvent[]; total: number }>;
}

export const INotificationEventRepository = Symbol('INotificationEventRepository');
