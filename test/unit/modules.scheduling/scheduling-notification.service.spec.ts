import { DomainEvents } from '@shared/events/domain-events';
import { MessageBus } from '@shared/messaging/message-bus';
import { SchedulingNotificationService } from '@modules/scheduling/services/scheduling-notification.service';
import {
  SchedulingBookingCancelledEvent,
  SchedulingBookingConfirmedEvent,
  SchedulingBookingCreatedEvent,
  SchedulingBookingNoShowEvent,
  SchedulingBookingRescheduledEvent,
  SchedulingHoldCreatedEvent,
  SchedulingPaymentStatusChangedEvent,
} from '@modules/scheduling/services/scheduling-event.types';

describe('SchedulingNotificationService', () => {
  let messageBus: jest.Mocked<MessageBus>;
  let service: SchedulingNotificationService;

  beforeEach(() => {
    messageBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<MessageBus>;
    service = new SchedulingNotificationService(messageBus);
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
    expectedEventName: string;
  }>([
    {
      description: 'hold criado',
      expectedEventName: DomainEvents.NOTIFICATION_SCHEDULING_HOLD_CREATED,
      invoke: () =>
        service.notifyHoldCreated({
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
      expectedEventName: DomainEvents.NOTIFICATION_SCHEDULING_BOOKING_CREATED,
      invoke: () =>
        service.notifyBookingCreated({
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
      expectedEventName: DomainEvents.NOTIFICATION_SCHEDULING_BOOKING_CONFIRMED,
      invoke: () =>
        service.notifyBookingConfirmed({
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
      expectedEventName: DomainEvents.NOTIFICATION_SCHEDULING_BOOKING_RESCHEDULED,
      invoke: () =>
        service.notifyBookingRescheduled({
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
      expectedEventName: DomainEvents.NOTIFICATION_SCHEDULING_BOOKING_CANCELLED,
      invoke: () =>
        service.notifyBookingCancelled({
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
      expectedEventName: DomainEvents.NOTIFICATION_SCHEDULING_BOOKING_NO_SHOW,
      invoke: () =>
        service.notifyBookingNoShow({
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
      expectedEventName: DomainEvents.NOTIFICATION_SCHEDULING_PAYMENT_STATUS_CHANGED,
      invoke: () =>
        service.notifyPaymentStatusChanged({
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
  ])('publica evento de notificacao quando $description', async ({ invoke, expectedEventName }) => {
    messageBus.publish.mockClear();

    await invoke();

    expect(messageBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: expectedEventName }),
    );
  });
});
