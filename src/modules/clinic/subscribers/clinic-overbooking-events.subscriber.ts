import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { DomainEvent } from '../../../shared/events/domain-event.interface';
import { DomainEvents } from '../../../shared/events/domain-events';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { ClinicOverbookingNotificationService } from '../services/clinic-overbooking-notification.service';
import {
  ClinicOverbookingReviewedEvent,
  ClinicOverbookingReviewRequestedEvent,
} from '../services/clinic-overbooking-event.types';

@Injectable()
export class ClinicOverbookingEventsSubscriber implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ClinicOverbookingEventsSubscriber.name);
  private readonly listeners = new Map<string, (event: DomainEvent) => Promise<void>>();

  constructor(
    private readonly messageBus: MessageBus,
    private readonly notificationService: ClinicOverbookingNotificationService,
  ) {}

  onModuleInit(): void {
    this.registerHandler(DomainEvents.CLINIC_OVERBOOKING_REVIEW_REQUESTED, async (event) => {
      const typed = event as unknown as ClinicOverbookingReviewRequestedEvent;
      await this.executeSafely(event, 'overbooking.notifyReviewRequested', () =>
        this.notificationService.notifyReviewRequested(typed),
      );
    });

    this.registerHandler(DomainEvents.CLINIC_OVERBOOKING_REVIEWED, async (event) => {
      const typed = event as unknown as ClinicOverbookingReviewedEvent;
      await this.executeSafely(event, 'overbooking.notifyReviewOutcome', () =>
        this.notificationService.notifyReviewOutcome(typed),
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
    this.logger.log(`ClinicOverbookingEventsSubscriber listening to ${eventName}`);
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
