import { Result } from '../../../../shared/types/result.type';
import { ListNotificationEventsInput, NotificationEvent } from '../../types/notification.types';

export interface IListNotificationEventsUseCase {
  execute(
    input: ListNotificationEventsInput,
  ): Promise<Result<{ data: NotificationEvent[]; total: number }>>;
  executeOrThrow(
    input: ListNotificationEventsInput,
  ): Promise<{ data: NotificationEvent[]; total: number }>;
}

export const IListNotificationEventsUseCase = Symbol('IListNotificationEventsUseCase');
