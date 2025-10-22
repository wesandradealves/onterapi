import { DomainEvents } from '@shared/events/domain-events';
import { MessageBus } from '@shared/messaging/message-bus';
import { SchedulingMetricsService } from '@modules/scheduling/services/scheduling-metrics.service';
import {
  SchedulingBookingCancelledEvent,
  SchedulingBookingConfirmedEvent,
  SchedulingBookingCreatedEvent,
  SchedulingBookingNoShowEvent,
  SchedulingBookingRescheduledEvent,
  SchedulingHoldCreatedEvent,
  SchedulingPaymentStatusChangedEvent,
} from '@modules/scheduling/services/scheduling-event.types';

describe('SchedulingMetricsService', () => {
  let messageBus: jest.Mocked<MessageBus>;
  let service: SchedulingMetricsService;

  beforeEach(() => {
    messageBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<MessageBus>;
    service = new SchedulingMetricsService(messageBus);
  });

  const baseContext = {
    tenantId: 'tenant-1',
    clinicId: 'clinic-1',
    professionalId: 'prof-1',
    patientId: 'patient-1',
  } as const;

  it.each<{
    description: string;
    invoke: () => Promise<void>;
    expectedMetric: string;
  }>([
    {
      description: 'hold criado',
      expectedMetric: 'holds.created',
      invoke: () =>
        service.recordHoldCreated({
          eventId: 'evt-1',
          eventName: DomainEvents.SCHEDULING_HOLD_CREATED,
          aggregateId: 'hold-1',
          occurredOn: new Date(),
          payload: {
            holdId: 'hold-1',
            ...baseContext,
            serviceTypeId: 'service-1',
            startAtUtc: new Date('2025-10-10T10:00:00Z'),
            endAtUtc: new Date('2025-10-10T11:00:00Z'),
            ttlExpiresAtUtc: new Date('2025-10-10T09:45:00Z'),
            createdAt: new Date('2025-10-09T10:00:00Z'),
          },
          metadata: {},
        } as SchedulingHoldCreatedEvent),
    },
    {
      description: 'booking criado',
      expectedMetric: 'bookings.created',
      invoke: () =>
        service.recordBookingCreated({
          eventId: 'evt-2',
          eventName: DomainEvents.SCHEDULING_BOOKING_CREATED,
          aggregateId: 'booking-1',
          occurredOn: new Date(),
          payload: {
            bookingId: 'booking-1',
            ...baseContext,
            startAtUtc: new Date('2025-10-10T10:00:00Z'),
            endAtUtc: new Date('2025-10-10T11:00:00Z'),
            source: 'clinic_portal',
            timezone: 'America/Sao_Paulo',
            createdAt: new Date('2025-10-09T10:05:00Z'),
          },
          metadata: {},
        } as SchedulingBookingCreatedEvent),
    },
    {
      description: 'booking confirmado',
      expectedMetric: 'bookings.confirmed',
      invoke: () =>
        service.recordBookingConfirmed({
          eventId: 'evt-3',
          eventName: DomainEvents.SCHEDULING_BOOKING_CONFIRMED,
          aggregateId: 'booking-1',
          occurredOn: new Date(),
          payload: {
            bookingId: 'booking-1',
            ...baseContext,
            startAtUtc: new Date('2025-10-10T10:00:00Z'),
            endAtUtc: new Date('2025-10-10T11:00:00Z'),
            source: 'clinic_portal',
            confirmedAt: new Date('2025-10-09T10:00:00Z'),
          },
          metadata: {},
        } as SchedulingBookingConfirmedEvent),
    },
    {
      description: 'booking reagendado',
      expectedMetric: 'bookings.rescheduled',
      invoke: () =>
        service.recordBookingRescheduled({
          eventId: 'evt-4',
          eventName: DomainEvents.SCHEDULING_BOOKING_RESCHEDULED,
          aggregateId: 'booking-1',
          occurredOn: new Date(),
          payload: {
            bookingId: 'booking-1',
            ...baseContext,
            previousStartAtUtc: new Date('2025-10-10T10:00:00Z'),
            previousEndAtUtc: new Date('2025-10-10T11:00:00Z'),
            newStartAtUtc: new Date('2025-10-11T10:00:00Z'),
            newEndAtUtc: new Date('2025-10-11T11:00:00Z'),
            rescheduledAt: new Date('2025-10-09T11:00:00Z'),
          },
          metadata: {},
        } as SchedulingBookingRescheduledEvent),
    },
    {
      description: 'booking cancelado',
      expectedMetric: 'bookings.cancelled',
      invoke: () =>
        service.recordBookingCancelled({
          eventId: 'evt-5',
          eventName: DomainEvents.SCHEDULING_BOOKING_CANCELLED,
          aggregateId: 'booking-1',
          occurredOn: new Date(),
          payload: {
            bookingId: 'booking-1',
            ...baseContext,
            cancelledBy: 'user-1',
            reason: 'patient_request',
            cancelledAt: new Date('2025-10-09T12:00:00Z'),
          },
          metadata: {},
        } as SchedulingBookingCancelledEvent),
    },
    {
      description: 'booking no-show',
      expectedMetric: 'bookings.no_show',
      invoke: () =>
        service.recordBookingNoShow({
          eventId: 'evt-6',
          eventName: DomainEvents.SCHEDULING_BOOKING_NO_SHOW,
          aggregateId: 'booking-1',
          occurredOn: new Date(),
          payload: {
            bookingId: 'booking-1',
            ...baseContext,
            markedAt: new Date('2025-10-10T10:30:00Z'),
          },
          metadata: {},
        } as SchedulingBookingNoShowEvent),
    },
    {
      description: 'pagamento alterado',
      expectedMetric: 'payments.status_changed',
      invoke: () =>
        service.recordPaymentStatusChanged({
          eventId: 'evt-7',
          eventName: DomainEvents.SCHEDULING_PAYMENT_STATUS_CHANGED,
          aggregateId: 'booking-1',
          occurredOn: new Date(),
          payload: {
            bookingId: 'booking-1',
            ...baseContext,
            previousStatus: 'pending',
            newStatus: 'settled',
            changedAt: new Date('2025-10-09T13:00:00Z'),
          },
          metadata: {},
        } as SchedulingPaymentStatusChangedEvent),
    },
  ])('publica metrica quando $description', async ({ invoke, expectedMetric }) => {
    messageBus.publish.mockClear();

    await invoke();

    expect(messageBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: DomainEvents.ANALYTICS_SCHEDULING_METRIC_INCREMENTED,
        aggregateId: expectedMetric,
      }),
    );
  });
});
