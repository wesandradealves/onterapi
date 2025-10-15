import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { DomainEvent } from '../../../shared/events/domain-event.interface';
import { DomainEvents } from '../../../shared/events/domain-events';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { ClinicPaymentPayoutRequestedEvent } from '../services/clinic-payment-event.types';
import { ClinicPaymentPayoutProcessorService } from '../services/clinic-payment-payout-processor.service';

@Injectable()
export class ClinicPaymentPayoutEventsSubscriber implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ClinicPaymentPayoutEventsSubscriber.name);
  private readonly listeners = new Map<string, (event: DomainEvent) => Promise<void>>();

  constructor(
    private readonly messageBus: MessageBus,
    private readonly payoutProcessor: ClinicPaymentPayoutProcessorService,
  ) {}

  onModuleInit(): void {
    this.registerHandler(
      DomainEvents.BILLING_CLINIC_PAYMENT_PAYOUT_REQUESTED,
      async (event) => {
        const typed = event as unknown as ClinicPaymentPayoutRequestedEvent;
        await this.executeSafely(event, 'payoutProcessor.handleEvent', () =>
          this.payoutProcessor.handleEvent(typed),
        );
      },
    );
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
    this.logger.log(`ClinicPaymentPayoutEventsSubscriber listening to ${eventName}`);
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
