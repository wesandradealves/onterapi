import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NotificationEventEntity } from '../../infrastructure/notifications/entities/notification-event.entity';
import { NotificationEventRepository } from '../../infrastructure/notifications/repositories/notification-event.repository';
import { NotificationEventLogService } from './notification-event-log.service';
import { NotificationEventsSubscriber } from './notification-events.subscriber';
import { INotificationEventRepository as INotificationEventRepositoryToken } from '../../domain/notifications/interfaces/notification-event.repository.interface';
import { NotificationEventsController } from './api/controllers/notification-events.controller';
import { IListNotificationEventsUseCase as IListNotificationEventsUseCaseToken } from '../../domain/notifications/interfaces/use-cases/list-notification-events.use-case.interface';
import { ListNotificationEventsUseCase } from './use-cases/list-notification-events.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationEventEntity])],
  controllers: [NotificationEventsController],
  providers: [
    { provide: INotificationEventRepositoryToken, useClass: NotificationEventRepository },
    NotificationEventLogService,
    NotificationEventsSubscriber,
    { provide: IListNotificationEventsUseCaseToken, useClass: ListNotificationEventsUseCase },
  ],
  exports: [NotificationEventLogService],
})
export class NotificationsModule {}
