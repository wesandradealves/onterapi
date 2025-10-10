import { Injectable, Logger } from '@nestjs/common';

import {
  SchedulingBookingCancelledEvent,
  SchedulingBookingConfirmedEvent,
  SchedulingBookingCreatedEvent,
  SchedulingBookingNoShowEvent,
  SchedulingBookingRescheduledEvent,
  SchedulingHoldCreatedEvent,
  SchedulingPaymentStatusChangedEvent,
} from './scheduling-event.types';
import { MessageBus } from '@shared/messaging/message-bus';
import { DomainEvents } from '@shared/events/domain-events';

@Injectable()
export class SchedulingNotificationService {
  private readonly logger = new Logger(SchedulingNotificationService.name);

  constructor(private readonly messageBus: MessageBus) {}

  async notifyHoldCreated(event: SchedulingHoldCreatedEvent): Promise<void> {
    const { aggregateId, payload } = event;

    await this.messageBus.publish(
      DomainEvents.notificationsSchedulingHoldCreated(aggregateId, {
        tenantId: payload.tenantId,
        clinicId: payload.clinicId,
        professionalId: payload.professionalId,
        patientId: payload.patientId,
        startAtUtc: payload.startAtUtc,
        endAtUtc: payload.endAtUtc,
      }),
    );

    this.logger.debug('Dispatching hold creation notifications', {
      holdId: aggregateId,
      tenantId: payload.tenantId,
      clinicId: payload.clinicId,
      professionalId: payload.professionalId,
      patientId: payload.patientId,
    });
  }

  async notifyBookingCreated(event: SchedulingBookingCreatedEvent): Promise<void> {
    const { aggregateId, payload } = event;

    await this.messageBus.publish(
      DomainEvents.notificationsSchedulingBookingCreated(aggregateId, {
        tenantId: payload.tenantId,
        clinicId: payload.clinicId,
        professionalId: payload.professionalId,
        patientId: payload.patientId,
        startAtUtc: payload.startAtUtc,
        endAtUtc: payload.endAtUtc,
        source: payload.source,
        timezone: payload.timezone,
      }),
    );

    this.logger.debug('Dispatching booking creation notifications', {
      bookingId: aggregateId,
      tenantId: payload.tenantId,
      clinicId: payload.clinicId,
      professionalId: payload.professionalId,
      patientId: payload.patientId,
      source: payload.source,
    });
  }

  async notifyBookingConfirmed(event: SchedulingBookingConfirmedEvent): Promise<void> {
    const { aggregateId, payload } = event;

    await this.messageBus.publish(
      DomainEvents.notificationsSchedulingBookingConfirmed(aggregateId, {
        tenantId: payload.tenantId,
        clinicId: payload.clinicId,
        professionalId: payload.professionalId,
        patientId: payload.patientId,
        confirmedAt: payload.confirmedAt,
      }),
    );

    this.logger.debug('Dispatching booking confirmation notifications', {
      bookingId: aggregateId,
      tenantId: payload.tenantId,
      clinicId: payload.clinicId,
      professionalId: payload.professionalId,
      patientId: payload.patientId,
      confirmedAt: payload.confirmedAt.toISOString(),
    });
  }

  async notifyBookingRescheduled(event: SchedulingBookingRescheduledEvent): Promise<void> {
    const { aggregateId, payload } = event;

    await this.messageBus.publish(
      DomainEvents.notificationsSchedulingBookingRescheduled(aggregateId, {
        tenantId: payload.tenantId,
        clinicId: payload.clinicId,
        professionalId: payload.professionalId,
        patientId: payload.patientId,
        previousStartAtUtc: payload.previousStartAtUtc,
        newStartAtUtc: payload.newStartAtUtc,
        newEndAtUtc: payload.newEndAtUtc,
      }),
    );

    this.logger.debug('Dispatching booking reschedule notifications', {
      bookingId: aggregateId,
      tenantId: payload.tenantId,
      clinicId: payload.clinicId,
      professionalId: payload.professionalId,
      patientId: payload.patientId,
      previousStartAtUtc: payload.previousStartAtUtc.toISOString(),
      newStartAtUtc: payload.newStartAtUtc.toISOString(),
    });
  }

  async notifyBookingCancelled(event: SchedulingBookingCancelledEvent): Promise<void> {
    const { aggregateId, payload } = event;

    await this.messageBus.publish(
      DomainEvents.notificationsSchedulingBookingCancelled(aggregateId, {
        tenantId: payload.tenantId,
        clinicId: payload.clinicId,
        professionalId: payload.professionalId,
        patientId: payload.patientId,
        cancelledAt: payload.cancelledAt,
        reason: payload.reason,
      }),
    );

    this.logger.debug('Dispatching booking cancellation notifications', {
      bookingId: aggregateId,
      tenantId: payload.tenantId,
      clinicId: payload.clinicId,
      professionalId: payload.professionalId,
      patientId: payload.patientId,
      reason: payload.reason ?? null,
    });
  }

  async notifyBookingNoShow(event: SchedulingBookingNoShowEvent): Promise<void> {
    const { aggregateId, payload } = event;

    await this.messageBus.publish(
      DomainEvents.notificationsSchedulingBookingNoShow(aggregateId, {
        tenantId: payload.tenantId,
        clinicId: payload.clinicId,
        professionalId: payload.professionalId,
        patientId: payload.patientId,
        markedAt: payload.markedAt,
      }),
    );

    this.logger.debug('Dispatching booking no-show notifications', {
      bookingId: aggregateId,
      tenantId: payload.tenantId,
      clinicId: payload.clinicId,
      professionalId: payload.professionalId,
      patientId: payload.patientId,
      markedAt: payload.markedAt.toISOString(),
    });
  }

  async notifyPaymentStatusChanged(event: SchedulingPaymentStatusChangedEvent): Promise<void> {
    const { aggregateId, payload } = event;

    await this.messageBus.publish(
      DomainEvents.notificationsSchedulingPaymentStatusChanged(aggregateId, {
        tenantId: payload.tenantId,
        clinicId: payload.clinicId,
        professionalId: payload.professionalId,
        patientId: payload.patientId,
        previousStatus: payload.previousStatus,
        newStatus: payload.newStatus,
        changedAt: payload.changedAt,
      }),
    );

    this.logger.debug('Dispatching payment status change notifications', {
      bookingId: aggregateId,
      tenantId: payload.tenantId,
      clinicId: payload.clinicId,
      professionalId: payload.professionalId,
      patientId: payload.patientId,
      previousStatus: payload.previousStatus,
      newStatus: payload.newStatus,
    });
  }
}
