import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { DomainEvent } from '../events/domain-event.interface';

@Injectable()
export class MessageBus {
  private readonly logger = new Logger(MessageBus.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  async publish<T = Record<string, unknown>>(event: DomainEvent<T>): Promise<void> {
    this.logger.log(`Publishing event: ${event.eventName}`);

    await this.eventEmitter.emitAsync(event.eventName, event);

    this.logger.log(`Event published successfully: ${event.eventName}`);
  }

  async publishMany<T = Record<string, unknown>>(events: DomainEvent<T>[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  subscribe<T = Record<string, unknown>>(
    eventName: string,
    handler: (event: DomainEvent<T>) => void | Promise<void>,
  ): void {
    this.eventEmitter.on(eventName, handler);
    this.logger.log(`Subscribed to event: ${eventName}`);
  }

  unsubscribe(eventName: string, handler: (...args: unknown[]) => void): void {
    this.eventEmitter.off(eventName, handler);
    this.logger.log(`Unsubscribed from event: ${eventName}`);
  }
}
