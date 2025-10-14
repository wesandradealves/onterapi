import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import {
  IListNotificationEventsUseCase,
  IListNotificationEventsUseCase as IListNotificationEventsUseCaseToken,
} from '../../../domain/notifications/interfaces/use-cases/list-notification-events.use-case.interface';
import {
  type INotificationEventRepository,
  INotificationEventRepository as INotificationEventRepositoryToken,
} from '../../../domain/notifications/interfaces/notification-event.repository.interface';
import {
  ListNotificationEventsInput,
  NotificationEvent,
} from '../../../domain/notifications/types/notification.types';

@Injectable()
export class ListNotificationEventsUseCase
  extends BaseUseCase<ListNotificationEventsInput, { data: NotificationEvent[]; total: number }>
  implements IListNotificationEventsUseCase
{
  protected readonly logger = new Logger(ListNotificationEventsUseCase.name);

  constructor(
    @Inject(INotificationEventRepositoryToken)
    private readonly notificationEventRepository: INotificationEventRepository,
  ) {
    super();
  }

  protected async handle(
    input: ListNotificationEventsInput,
  ): Promise<{ data: NotificationEvent[]; total: number }> {
    return this.notificationEventRepository.findAll(input);
  }
}

export const ListNotificationEventsUseCaseToken = IListNotificationEventsUseCaseToken;
