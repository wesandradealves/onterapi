import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { DomainEvent } from '../../../shared/events/domain-event.interface';
import { DomainEvents } from '../../../shared/events/domain-events';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { AnamnesisMetricsService } from '../services/anamnesis-metrics.service';

@Injectable()
export class AnamnesisEventsSubscriber implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AnamnesisEventsSubscriber.name);
  private readonly listeners = new Map<string, (event: DomainEvent) => Promise<void>>();

  constructor(
    private readonly messageBus: MessageBus,
    private readonly metricsService: AnamnesisMetricsService,
  ) {}

  onModuleInit(): void {
    this.registerHandler(DomainEvents.ANAMNESIS_STEP_SAVED, async (event) => {
      await this.metricsService.recordStepSaved(event);
    });

    this.registerHandler(DomainEvents.ANAMNESIS_SUBMITTED, async (event) => {
      await this.metricsService.recordSubmission(event);
    });

    this.registerHandler(DomainEvents.ANAMNESIS_AI_COMPLETED, async (event) => {
      await this.metricsService.recordAICompleted(event);
    });

    this.registerHandler(DomainEvents.ANAMNESIS_PLAN_FEEDBACK_SAVED, async (event) => {
      await this.metricsService.recordPlanFeedback(event);
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
        this.logger.error(`Erro ao processar evento ${eventName}`, error as Error);
      }
    };

    this.listeners.set(eventName, listener);
    this.messageBus.subscribe(eventName, listener);
    this.logger.log(`AnamnesisEventsSubscriber listening to ${eventName}`);
  }
}
