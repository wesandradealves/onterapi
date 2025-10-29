import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { DomainEvent } from '../../../shared/events/domain-event.interface';
import { DomainEvents } from '../../../shared/events/domain-events';
import { MessageBus } from '../../../shared/messaging/message-bus';
import {
  ClinicPaymentChargebackEvent,
  ClinicPaymentFailedEvent,
  ClinicPaymentRefundedEvent,
  ClinicPaymentSettledEvent,
  ClinicPaymentStatusChangedEvent,
} from '../services/clinic-payment-event.types';
import { ClinicPaymentReconciliationService } from '../services/clinic-payment-reconciliation.service';

@Injectable()
export class ClinicPaymentEventsSubscriber implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ClinicPaymentEventsSubscriber.name);
  private readonly listeners = new Map<string, (event: DomainEvent) => Promise<void>>();

  constructor(
    private readonly messageBus: MessageBus,
    private readonly paymentReconciliationService: ClinicPaymentReconciliationService,
  ) {}

  onModuleInit(): void {
    this.registerHandler(DomainEvents.CLINIC_PAYMENT_STATUS_CHANGED, async (event) => {
      const typed = event as unknown as ClinicPaymentStatusChangedEvent;
      await this.executeSafely(event, 'paymentReconciliation.handleStatusChanged', () =>
        this.paymentReconciliationService.handleStatusChanged(typed),
      );
    });

    this.registerHandler(DomainEvents.CLINIC_PAYMENT_SETTLED, async (event) => {
      const typed = event as unknown as ClinicPaymentSettledEvent;
      await this.executeSafely(event, 'paymentReconciliation.handlePaymentSettled', () =>
        this.paymentReconciliationService.handlePaymentSettled(typed),
      );
    });

    this.registerHandler(DomainEvents.CLINIC_PAYMENT_REFUNDED, async (event) => {
      const typed = event as unknown as ClinicPaymentRefundedEvent;
      await this.executeSafely(event, 'paymentReconciliation.handlePaymentRefunded', () =>
        this.paymentReconciliationService.handlePaymentRefunded(typed),
      );
    });

    this.registerHandler(DomainEvents.CLINIC_PAYMENT_CHARGEBACK, async (event) => {
      const typed = event as unknown as ClinicPaymentChargebackEvent;
      await this.executeSafely(event, 'paymentReconciliation.handlePaymentChargeback', () =>
        this.paymentReconciliationService.handlePaymentChargeback(typed),
      );
    });

    this.registerHandler(DomainEvents.CLINIC_PAYMENT_FAILED, async (event) => {
      const typed = event as unknown as ClinicPaymentFailedEvent;
      await this.executeSafely(event, 'paymentReconciliation.handlePaymentFailed', () =>
        this.paymentReconciliationService.handlePaymentFailed(typed),
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
    this.logger.log(`ClinicPaymentEventsSubscriber listening to ${eventName}`);
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
