import { Injectable, Logger } from '@nestjs/common';

import {
  SchedulingBookingCancelledEvent,
  SchedulingBookingConfirmedEvent,
  SchedulingPaymentStatusChangedEvent,
} from './scheduling-event.types';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';

@Injectable()
export class SchedulingBillingService {
  private readonly logger = new Logger(SchedulingBillingService.name);

  constructor(private readonly messageBus: MessageBus) {}

  async handleBookingConfirmed(event: SchedulingBookingConfirmedEvent): Promise<void> {
    const { aggregateId, payload } = event;

    await this.messageBus.publish(
      DomainEvents.billingInvoiceRequested(aggregateId, {
        tenantId: payload.tenantId,
        clinicId: payload.clinicId,
        professionalId: payload.professionalId,
        patientId: payload.patientId,
        source: payload.source,
        confirmedAt: payload.confirmedAt,
        startAtUtc: payload.startAtUtc,
        endAtUtc: payload.endAtUtc,
      }),
    );

    this.logger.debug('Preparing billing for confirmed booking', {
      bookingId: aggregateId,
      tenantId: payload.tenantId,
      clinicId: payload.clinicId,
      professionalId: payload.professionalId,
      patientId: payload.patientId,
      confirmedAt: payload.confirmedAt.toISOString(),
    });
  }

  async handleBookingCancelled(event: SchedulingBookingCancelledEvent): Promise<void> {
    const { aggregateId, payload } = event;

    await this.messageBus.publish(
      DomainEvents.billingInvoiceCancellationRequested(aggregateId, {
        tenantId: payload.tenantId,
        clinicId: payload.clinicId,
        professionalId: payload.professionalId,
        patientId: payload.patientId,
        cancelledAt: payload.cancelledAt,
        reason: payload.reason,
      }),
    );

    this.logger.debug('Reconciling billing after cancellation', {
      bookingId: aggregateId,
      tenantId: payload.tenantId,
      clinicId: payload.clinicId,
      professionalId: payload.professionalId,
      patientId: payload.patientId,
      cancelledBy: payload.cancelledBy,
      reason: payload.reason ?? null,
      cancelledAt: payload.cancelledAt.toISOString(),
    });
  }

  async handlePaymentStatusChanged(event: SchedulingPaymentStatusChangedEvent): Promise<void> {
    const { aggregateId, payload } = event;

    await this.messageBus.publish(
      DomainEvents.billingPaymentStatusSyncRequested(aggregateId, {
        tenantId: payload.tenantId,
        clinicId: payload.clinicId,
        professionalId: payload.professionalId,
        patientId: payload.patientId,
        previousStatus: payload.previousStatus,
        newStatus: payload.newStatus,
        changedAt: payload.changedAt,
      }),
    );

    this.logger.debug('Syncing payment status with billing provider', {
      bookingId: aggregateId,
      tenantId: payload.tenantId,
      clinicId: payload.clinicId,
      professionalId: payload.professionalId,
      patientId: payload.patientId,
      previousStatus: payload.previousStatus,
      newStatus: payload.newStatus,
      changedAt: payload.changedAt.toISOString(),
    });
  }
}
