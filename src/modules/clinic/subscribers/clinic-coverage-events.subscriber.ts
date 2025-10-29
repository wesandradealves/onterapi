import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { DomainEvent } from '../../../shared/events/domain-event.interface';
import { DomainEvents } from '../../../shared/events/domain-events';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { ClinicCoverageNotificationService } from '../services/clinic-coverage-notification.service';
import {
  ClinicCoverageAppliedEvent,
  ClinicCoverageReleasedEvent,
} from '../services/clinic-coverage-event.types';

@Injectable()
export class ClinicCoverageEventsSubscriber implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ClinicCoverageEventsSubscriber.name);
  private readonly listeners = new Map<string, (event: DomainEvent) => Promise<void>>();

  constructor(
    private readonly messageBus: MessageBus,
    private readonly notificationService: ClinicCoverageNotificationService,
  ) {}

  onModuleInit(): void {
    this.registerHandler(DomainEvents.CLINIC_COVERAGE_APPLIED, async (event) => {
      await this.safeExecute('notifyCoverageApplied', async () => {
        await this.notificationService.notifyCoverageApplied(
          event as unknown as ClinicCoverageAppliedEvent,
        );
      });
    });

    this.registerHandler(DomainEvents.CLINIC_COVERAGE_RELEASED, async (event) => {
      await this.safeExecute('notifyCoverageReleased', async () => {
        await this.notificationService.notifyCoverageReleased(
          event as unknown as ClinicCoverageReleasedEvent,
        );
      });
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
        this.logger.error(`Erro ao processar evento ${eventName}`, error as Error, {
          aggregateId: event.aggregateId,
        });
      }
    };

    this.listeners.set(eventName, listener);
    this.messageBus.subscribe(eventName, listener);
    this.logger.log(`ClinicCoverageEventsSubscriber listening to ${eventName}`);
  }

  private async safeExecute(scope: string, callback: () => Promise<void>): Promise<void> {
    try {
      await callback();
    } catch (error) {
      this.logger.error(`Erro inesperado em ${scope}`, error as Error);
    }
  }
}
