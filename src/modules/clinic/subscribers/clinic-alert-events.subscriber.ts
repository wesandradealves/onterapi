import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { DomainEvent } from '../../../shared/events/domain-event.interface';
import { DomainEvents } from '../../../shared/events/domain-events';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { ClinicAlertNotificationService } from '../services/clinic-alert-notification.service';
import {
  ClinicAlertResolvedEvent,
  ClinicAlertTriggeredEvent,
} from '../services/clinic-alert-event.types';

@Injectable()
export class ClinicAlertEventsSubscriber implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ClinicAlertEventsSubscriber.name);
  private readonly listeners = new Map<string, (event: DomainEvent) => Promise<void>>();

  constructor(
    private readonly messageBus: MessageBus,
    private readonly notificationService: ClinicAlertNotificationService,
  ) {}

  onModuleInit(): void {
    this.registerHandler(DomainEvents.CLINIC_ALERT_TRIGGERED, async (event) => {
      const typed = event as unknown as ClinicAlertTriggeredEvent;
      await this.executeSafely(event, 'notifications.notifyAlertTriggered', () =>
        this.notificationService.notifyAlertTriggered(typed),
      );
    });

    this.registerHandler(DomainEvents.CLINIC_ALERT_RESOLVED, async (event) => {
      const typed = event as unknown as ClinicAlertResolvedEvent;
      await this.executeSafely(event, 'notifications.notifyAlertResolved', () =>
        this.notificationService.notifyAlertResolved(typed),
      );
    });
  }

  onModuleDestroy(): void {
    for (const [eventName, listener] of this.listeners.entries()) {
      this.messageBus.unsubscribe(eventName, listener as unknown as (...args: unknown[]) => void);
      this.listeners.delete(eventName);
    }
  }

  private registerHandler(
    eventName: string,
    handler: (event: DomainEvent) => Promise<void> | void,
  ): void {
    const listener = async (event: DomainEvent): Promise<void> => {
      try {
        await handler(event);
      } catch (error) {
        this.logger.error(`Erro inesperado ao processar evento ${eventName}`, error as Error, {
          aggregateId: event.aggregateId,
        });
      }
    };

    this.listeners.set(eventName, listener);
    this.messageBus.subscribe(eventName, listener);
    this.logger.log(`ClinicAlertEventsSubscriber listening to ${eventName}`);
  }

  private async executeSafely(
    event: DomainEvent,
    scope: string,
    callback: () => Promise<void> | void,
  ): Promise<void> {
    try {
      await callback();
    } catch (error) {
      this.logger.error(
        `Erro ao executar handler ${scope} para evento ${event.eventName}`,
        error as Error,
        { aggregateId: event.aggregateId },
      );
    }
  }
}
