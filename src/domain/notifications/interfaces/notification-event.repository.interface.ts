import {
  CreateNotificationEventInput,
  NotificationEvent,
  UpdateNotificationEventStatusInput,
} from '../../notifications/types/notification.types';

export interface INotificationEventRepository {
  create(input: CreateNotificationEventInput): Promise<NotificationEvent>;
  updateStatus(input: UpdateNotificationEventStatusInput): Promise<void>;
}

export const INotificationEventRepository = Symbol('INotificationEventRepository');
