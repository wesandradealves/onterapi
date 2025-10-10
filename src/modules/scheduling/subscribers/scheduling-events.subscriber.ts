import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { DomainEvent } from '@shared/events/domain-event.interface';
import { DomainEvents } from '@shared/events/domain-events';
import { MessageBus } from '@shared/messaging/message-bus';
import { SchedulingBillingService } from '../services/scheduling-billing.service';
import { SchedulingMetricsService } from '../services/scheduling-metrics.service';
import { SchedulingNotificationService } from '../services/scheduling-notification.service';
import {
  SchedulingBookingCancelledEvent,
  SchedulingBookingConfirmedEvent,
  SchedulingBookingCreatedEvent,
  SchedulingBookingNoShowEvent,
  SchedulingBookingRescheduledEvent,
  SchedulingHoldCreatedEvent,
  SchedulingPaymentStatusChangedEvent,
} from '../services/scheduling-event.types';

@Injectable()
export class SchedulingEventsSubscriber implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SchedulingEventsSubscriber.name);
  private readonly listeners = new Map<string, (event: DomainEvent) => Promise<void>>();

  constructor(
    private readonly messageBus: MessageBus,
    private readonly billingService: SchedulingBillingService,
    private readonly metricsService: SchedulingMetricsService,
    private readonly notificationService: SchedulingNotificationService,
  ) {}

  onModuleInit(): void {
    this.registerHandler(DomainEvents.SCHEDULING_HOLD_CREATED, async (event) => {
      const typed = event as unknown as SchedulingHoldCreatedEvent;

      await this.executeSafely(event, 'metrics.recordHoldCreated', () =>
        this.metricsService.recordHoldCreated(typed),
      );
      await this.executeSafely(event, 'notifications.notifyHoldCreated', () =>
        this.notificationService.notifyHoldCreated(typed),
      );
    });

    this.registerHandler(DomainEvents.SCHEDULING_BOOKING_CREATED, async (event) => {
      const typed = event as unknown as SchedulingBookingCreatedEvent;

      await this.executeSafely(event, 'metrics.recordBookingCreated', () =>
        this.metricsService.recordBookingCreated(typed),
      );
      await this.executeSafely(event, 'notifications.notifyBookingCreated', () =>
        this.notificationService.notifyBookingCreated(typed),
      );
    });

    this.registerHandler(DomainEvents.SCHEDULING_BOOKING_CONFIRMED, async (event) => {
      const typed = event as unknown as SchedulingBookingConfirmedEvent;

      await this.executeSafely(event, 'metrics.recordBookingConfirmed', () =>
        this.metricsService.recordBookingConfirmed(typed),
      );
      await this.executeSafely(event, 'billing.handleBookingConfirmed', () =>
        this.billingService.handleBookingConfirmed(typed),
      );
      await this.executeSafely(event, 'notifications.notifyBookingConfirmed', () =>
        this.notificationService.notifyBookingConfirmed(typed),
      );
    });

    this.registerHandler(DomainEvents.SCHEDULING_BOOKING_RESCHEDULED, async (event) => {
      const typed = event as unknown as SchedulingBookingRescheduledEvent;

      await this.executeSafely(event, 'metrics.recordBookingRescheduled', () =>
        this.metricsService.recordBookingRescheduled(typed),
      );
      await this.executeSafely(event, 'notifications.notifyBookingRescheduled', () =>
        this.notificationService.notifyBookingRescheduled(typed),
      );
    });

    this.registerHandler(DomainEvents.SCHEDULING_BOOKING_CANCELLED, async (event) => {
      const typed = event as unknown as SchedulingBookingCancelledEvent;

      await this.executeSafely(event, 'metrics.recordBookingCancelled', () =>
        this.metricsService.recordBookingCancelled(typed),
      );
      await this.executeSafely(event, 'billing.handleBookingCancelled', () =>
        this.billingService.handleBookingCancelled(typed),
      );
      await this.executeSafely(event, 'notifications.notifyBookingCancelled', () =>
        this.notificationService.notifyBookingCancelled(typed),
      );
    });

    this.registerHandler(DomainEvents.SCHEDULING_BOOKING_NO_SHOW, async (event) => {
      const typed = event as unknown as SchedulingBookingNoShowEvent;

      await this.executeSafely(event, 'metrics.recordBookingNoShow', () =>
        this.metricsService.recordBookingNoShow(typed),
      );
      await this.executeSafely(event, 'notifications.notifyBookingNoShow', () =>
        this.notificationService.notifyBookingNoShow(typed),
      );
    });

    this.registerHandler(DomainEvents.SCHEDULING_PAYMENT_STATUS_CHANGED, async (event) => {
      const typed = event as unknown as SchedulingPaymentStatusChangedEvent;

      await this.executeSafely(event, 'metrics.recordPaymentStatusChanged', () =>
        this.metricsService.recordPaymentStatusChanged(typed),
      );
      await this.executeSafely(event, 'billing.handlePaymentStatusChanged', () =>
        this.billingService.handlePaymentStatusChanged(typed),
      );
      await this.executeSafely(event, 'notifications.notifyPaymentStatusChanged', () =>
        this.notificationService.notifyPaymentStatusChanged(typed),
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
    this.logger.log(`SchedulingEventsSubscriber listening to ${eventName}`);
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
