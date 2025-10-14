import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NotificationEventEntity } from '../../infrastructure/notifications/entities/notification-event.entity';
import { NotificationEventRepository } from '../../infrastructure/notifications/repositories/notification-event.repository';
import { NotificationEventLogService } from './notification-event-log.service';
import { NotificationEventsSubscriber } from './notification-events.subscriber';
import { INotificationEventRepository as INotificationEventRepositoryToken } from '../../domain/notifications/interfaces/notification-event.repository.interface';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationEventEntity])],
  providers: [
    { provide: INotificationEventRepositoryToken, useClass: NotificationEventRepository },
    NotificationEventLogService,
    NotificationEventsSubscriber,
  ],
  exports: [NotificationEventLogService],
})
export class NotificationsModule {}
