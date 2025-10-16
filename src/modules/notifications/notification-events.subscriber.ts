import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { DomainEvent } from '../../shared/events/domain-event.interface';
import { DomainEvents } from '../../shared/events/domain-events';
import { MessageBus } from '../../shared/messaging/message-bus';
import { NotificationEventLogService } from './notification-event-log.service';

interface NormalizedPayload {
  raw: Record<string, unknown>;
  queuedAt?: Date;
  recipientIds?: unknown;
  channels?: unknown;
}

@Injectable()
export class NotificationEventsSubscriber implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationEventsSubscriber.name);
  private readonly listeners = new Map<string, (event: DomainEvent) => Promise<void>>();

  constructor(
    private readonly messageBus: MessageBus,
    private readonly notificationEventLogService: NotificationEventLogService,
  ) {}

  onModuleInit(): void {
    const events = [
      DomainEvents.NOTIFICATION_CLINIC_ALERT_TRIGGERED,
      DomainEvents.NOTIFICATION_CLINIC_ALERT_RESOLVED,
      DomainEvents.NOTIFICATION_SCHEDULING_HOLD_CREATED,
      DomainEvents.NOTIFICATION_SCHEDULING_BOOKING_CREATED,
      DomainEvents.NOTIFICATION_SCHEDULING_BOOKING_CONFIRMED,
      DomainEvents.NOTIFICATION_SCHEDULING_BOOKING_RESCHEDULED,
      DomainEvents.NOTIFICATION_SCHEDULING_BOOKING_CANCELLED,
      DomainEvents.NOTIFICATION_SCHEDULING_BOOKING_NO_SHOW,
      DomainEvents.NOTIFICATION_SCHEDULING_PAYMENT_STATUS_CHANGED,
      DomainEvents.NOTIFICATION_CLINIC_PAYMENT_SETTLED,
      DomainEvents.NOTIFICATION_CLINIC_PAYMENT_REFUNDED,
      DomainEvents.NOTIFICATION_CLINIC_PAYMENT_CHARGEBACK,
      DomainEvents.NOTIFICATION_CLINIC_OVERBOOKING_REVIEW_REQUESTED,
      DomainEvents.NOTIFICATION_CLINIC_OVERBOOKING_REVIEWED,
    ];

    events.forEach((eventName) => this.subscribe(eventName));
  }

  onModuleDestroy(): void {
    for (const [eventName, listener] of this.listeners.entries()) {
      this.messageBus.unsubscribe(eventName, listener as unknown as (...args: unknown[]) => void);
      this.listeners.delete(eventName);
    }
  }

  private subscribe(eventName: string): void {
    const listener = async (event: DomainEvent): Promise<void> => {
      try {
        const normalized = this.normalizePayload(event.payload);
        const recipients = this.extractStringArray(normalized.recipientIds) ?? [];
        const channels =
          this.extractStringArray(normalized.channels, true) ??
          this.extractChannelsFromPayload(normalized.raw);

        await this.notificationEventLogService.record({
          eventName,
          aggregateId: event.aggregateId,
          payload: normalized.raw,
          recipients,
          channels,
          queuedAt: normalized.queuedAt ?? new Date(),
        });
      } catch (error) {
        this.logger.error(`Failed to record notification event ${eventName}`, error as Error, {
          aggregateId: event.aggregateId,
        });
      }
    };

    this.listeners.set(eventName, listener);
    this.messageBus.subscribe(eventName, listener);
    this.logger.log(`NotificationEventsSubscriber listening to ${eventName}`);
  }

  private extractChannelsFromPayload(payload: unknown): string[] {
    if (!payload || typeof payload !== 'object') {
      return [];
    }

    const candidate = payload as Record<string, unknown>;
    const channel = candidate['channel'] ?? candidate['defaultChannel'];

    if (typeof channel === 'string') {
      return [channel];
    }

    return [];
  }

  private normalizePayload(payload: DomainEvent['payload']): NormalizedPayload {
    if (!payload || typeof payload !== 'object') {
      return { raw: {} };
    }

    const raw = payload as Record<string, unknown>;
    const queuedAt = this.parseDate(raw.queuedAt);

    return {
      raw,
      queuedAt,
      recipientIds: raw.recipientIds,
      channels: raw.channels,
    };
  }

  private extractStringArray(value: unknown, allowEmpty = false): string[] | undefined {
    if (!Array.isArray(value)) {
      return undefined;
    }

    const result = value.filter((item): item is string => typeof item === 'string');
    if (result.length === 0 && !allowEmpty) {
      return undefined;
    }
    return result;
  }

  private parseDate(value: unknown): Date | undefined {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value;
    }

    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    return undefined;
  }
}
