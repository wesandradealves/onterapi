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
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';

@Injectable()
export class SchedulingMetricsService {
  private readonly logger = new Logger(SchedulingMetricsService.name);

  constructor(private readonly messageBus: MessageBus) {}

  async recordHoldCreated(event: SchedulingHoldCreatedEvent): Promise<void> {
    const { aggregateId, payload } = event;

    await this.publishMetric('holds.created', {
      tenantId: payload.tenantId,
      clinicId: payload.clinicId,
      professionalId: payload.professionalId,
      patientId: payload.patientId,
    });

    this.logger.debug('Recording hold creation metric', {
      holdId: aggregateId,
      tenantId: payload.tenantId,
      clinicId: payload.clinicId,
      professionalId: payload.professionalId,
      patientId: payload.patientId,
      startAtUtc: payload.startAtUtc.toISOString(),
      endAtUtc: payload.endAtUtc.toISOString(),
    });
  }

  async recordBookingCreated(event: SchedulingBookingCreatedEvent): Promise<void> {
    const { aggregateId, payload } = event;

    await this.publishMetric('bookings.created', {
      tenantId: payload.tenantId,
      clinicId: payload.clinicId,
      professionalId: payload.professionalId,
      patientId: payload.patientId,
    });

    this.logger.debug('Recording booking creation metric', {
      bookingId: aggregateId,
      tenantId: payload.tenantId,
      clinicId: payload.clinicId,
      professionalId: payload.professionalId,
      patientId: payload.patientId,
      source: payload.source,
      timezone: payload.timezone,
    });
  }

  async recordBookingConfirmed(event: SchedulingBookingConfirmedEvent): Promise<void> {
    const { aggregateId, payload } = event;

    await this.publishMetric('bookings.confirmed', {
      tenantId: payload.tenantId,
      clinicId: payload.clinicId,
      professionalId: payload.professionalId,
      patientId: payload.patientId,
    });

    this.logger.debug('Recording booking confirmation metric', {
      bookingId: aggregateId,
      tenantId: payload.tenantId,
      clinicId: payload.clinicId,
      professionalId: payload.professionalId,
      patientId: payload.patientId,
      confirmedAt: payload.confirmedAt.toISOString(),
    });
  }

  async recordBookingRescheduled(event: SchedulingBookingRescheduledEvent): Promise<void> {
    const { aggregateId, payload } = event;

    await this.publishMetric('bookings.rescheduled', {
      tenantId: payload.tenantId,
      clinicId: payload.clinicId,
      professionalId: payload.professionalId,
      patientId: payload.patientId,
    });

    this.logger.debug('Recording booking reschedule metric', {
      bookingId: aggregateId,
      tenantId: payload.tenantId,
      clinicId: payload.clinicId,
      professionalId: payload.professionalId,
      patientId: payload.patientId,
      previousStartAtUtc: payload.previousStartAtUtc.toISOString(),
      newStartAtUtc: payload.newStartAtUtc.toISOString(),
    });
  }

  async recordBookingCancelled(event: SchedulingBookingCancelledEvent): Promise<void> {
    const { aggregateId, payload } = event;

    await this.publishMetric('bookings.cancelled', {
      tenantId: payload.tenantId,
      clinicId: payload.clinicId,
      professionalId: payload.professionalId,
      patientId: payload.patientId,
    });

    this.logger.debug('Recording booking cancellation metric', {
      bookingId: aggregateId,
      tenantId: payload.tenantId,
      clinicId: payload.clinicId,
      professionalId: payload.professionalId,
      patientId: payload.patientId,
      reason: payload.reason ?? null,
      cancelledAt: payload.cancelledAt.toISOString(),
    });
  }

  async recordBookingNoShow(event: SchedulingBookingNoShowEvent): Promise<void> {
    const { aggregateId, payload } = event;

    await this.publishMetric('bookings.no_show', {
      tenantId: payload.tenantId,
      clinicId: payload.clinicId,
      professionalId: payload.professionalId,
      patientId: payload.patientId,
    });

    this.logger.debug('Recording booking no-show metric', {
      bookingId: aggregateId,
      tenantId: payload.tenantId,
      clinicId: payload.clinicId,
      professionalId: payload.professionalId,
      patientId: payload.patientId,
      markedAt: payload.markedAt.toISOString(),
    });
  }

  async recordPaymentStatusChanged(event: SchedulingPaymentStatusChangedEvent): Promise<void> {
    const { aggregateId, payload } = event;

    await this.publishMetric('payments.status_changed', {
      tenantId: payload.tenantId,
      clinicId: payload.clinicId,
      professionalId: payload.professionalId,
      patientId: payload.patientId,
    });

    this.logger.debug('Recording payment status change metric', {
      bookingId: aggregateId,
      tenantId: payload.tenantId,
      clinicId: payload.clinicId,
      professionalId: payload.professionalId,
      patientId: payload.patientId,
      previousStatus: payload.previousStatus,
      newStatus: payload.newStatus,
    });
  }

  private async publishMetric(
    metric: string,
    data: {
      tenantId: string;
      clinicId: string;
      professionalId: string;
      patientId: string;
    },
  ): Promise<void> {
    await this.messageBus.publish(DomainEvents.analyticsSchedulingMetricIncremented(metric, data));
  }
}
