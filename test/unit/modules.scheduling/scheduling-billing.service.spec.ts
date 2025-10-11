import { DomainEvents } from '@shared/events/domain-events';
import { MessageBus } from '@shared/messaging/message-bus';
import { SchedulingBillingService } from '@modules/scheduling/services/scheduling-billing.service';
import {
  SchedulingBookingCancelledEvent,
  SchedulingBookingConfirmedEvent,
  SchedulingPaymentStatusChangedEvent,
} from '@modules/scheduling/services/scheduling-event.types';

describe('SchedulingBillingService', () => {
  let messageBus: jest.Mocked<MessageBus>;
  let service: SchedulingBillingService;

  beforeEach(() => {
    messageBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<MessageBus>;

    service = new SchedulingBillingService(messageBus);
  });

  it('publica evento de billing para confirma��o de agendamento', async () => {
    const event: SchedulingBookingConfirmedEvent = {
      eventId: 'evt-1',
      eventName: DomainEvents.SCHEDULING_BOOKING_CONFIRMED,
      aggregateId: 'booking-1',
      occurredOn: new Date('2025-10-08T10:00:00Z'),
      payload: {
        bookingId: 'booking-1',
        tenantId: 'tenant-1',
        clinicId: 'clinic-1',
        professionalId: 'prof-1',
        patientId: 'patient-1',
        startAtUtc: new Date('2025-10-10T10:00:00Z'),
        endAtUtc: new Date('2025-10-10T11:00:00Z'),
        source: 'clinic_portal',
        confirmedAt: new Date('2025-10-08T10:05:00Z'),
      },
      metadata: {},
    };

    await service.handleBookingConfirmed(event);

    expect(messageBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: DomainEvents.BILLING_INVOICE_REQUESTED,
        aggregateId: event.aggregateId,
      }),
    );
  });

  it('publica evento de cancelamento para billing', async () => {
    const event: SchedulingBookingCancelledEvent = {
      eventId: 'evt-2',
      eventName: DomainEvents.SCHEDULING_BOOKING_CANCELLED,
      aggregateId: 'booking-1',
      occurredOn: new Date('2025-10-09T12:00:00Z'),
      payload: {
        bookingId: 'booking-1',
        tenantId: 'tenant-1',
        clinicId: 'clinic-1',
        professionalId: 'prof-1',
        patientId: 'patient-1',
        cancelledBy: 'user-1',
        reason: 'patient_request',
        cancelledAt: new Date('2025-10-09T12:00:00Z'),
      },
      metadata: {},
    };

    await service.handleBookingCancelled(event);

    expect(messageBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: DomainEvents.BILLING_INVOICE_CANCELLATION_REQUESTED,
        aggregateId: event.aggregateId,
      }),
    );
  });

  it('publica evento de sincroniza��o de pagamento', async () => {
    const event: SchedulingPaymentStatusChangedEvent = {
      eventId: 'evt-3',
      eventName: DomainEvents.SCHEDULING_PAYMENT_STATUS_CHANGED,
      aggregateId: 'booking-1',
      occurredOn: new Date('2025-10-09T13:00:00Z'),
      payload: {
        bookingId: 'booking-1',
        tenantId: 'tenant-1',
        clinicId: 'clinic-1',
        professionalId: 'prof-1',
        patientId: 'patient-1',
        previousStatus: 'pending',
        newStatus: 'settled',
        changedAt: new Date('2025-10-09T13:00:00Z'),
      },
      metadata: {},
    };

    await service.handlePaymentStatusChanged(event);

    expect(messageBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: DomainEvents.BILLING_PAYMENT_STATUS_SYNC_REQUESTED,
        aggregateId: event.aggregateId,
      }),
    );
  });
});
