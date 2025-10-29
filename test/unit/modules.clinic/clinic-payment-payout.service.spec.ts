import { ClinicPaymentPayoutService } from '../../../src/modules/clinic/services/clinic-payment-payout.service';
import { MessageBus } from '../../../src/shared/messaging/message-bus';
import { DomainEvents } from '../../../src/shared/events/domain-events';

describe('ClinicPaymentPayoutService', () => {
  let messageBus: jest.Mocked<MessageBus>;
  let service: ClinicPaymentPayoutService;

  beforeEach(() => {
    messageBus = {
      publish: jest.fn().mockResolvedValue(undefined),
      publishMany: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    } as unknown as jest.Mocked<MessageBus>;

    service = new ClinicPaymentPayoutService(messageBus);
  });

  it('publica evento de payout com dados do split', async () => {
    const settledAt = new Date('2099-01-01T12:05:00Z');

    await service.requestPayout({
      appointmentId: 'appointment-1',
      tenantId: 'tenant-1',
      clinicId: 'clinic-1',
      professionalId: 'professional-1',
      originalProfessionalId: 'professional-owner',
      coverageId: 'coverage-1',
      patientId: 'patient-1',
      holdId: 'hold-1',
      serviceTypeId: 'service-1',
      paymentTransactionId: 'pay-123',
      provider: 'asaas',
      credentialsId: 'cred-1',
      sandboxMode: false,
      bankAccountId: 'bank-1',
      settlement: {
        settledAt,
        baseAmountCents: 20000,
        netAmountCents: 18000,
        remainderCents: 0,
        split: [
          { recipient: 'clinic', percentage: 52, amountCents: 10400 },
          { recipient: 'professional', percentage: 40, amountCents: 8000 },
          { recipient: 'gateway', percentage: 3, amountCents: 600 },
          { recipient: 'taxes', percentage: 5, amountCents: 1000 },
        ],
      },
      currency: 'BRL',
      gateway: {
        status: 'RECEIVED_IN_ADVANCE',
        eventType: 'PAYMENT_CONFIRMED',
        fingerprint: 'fp-123',
        payloadId: 'asaas-evt-1',
        sandbox: false,
      },
    });

    expect(messageBus.publish).toHaveBeenCalledTimes(1);
    const event = messageBus.publish.mock.calls[0][0];

    expect(event.eventName).toBe(DomainEvents.BILLING_CLINIC_PAYMENT_PAYOUT_REQUESTED);
    expect(event.aggregateId).toBe('appointment-1');
    expect(event.payload).toMatchObject({
      appointmentId: 'appointment-1',
      tenantId: 'tenant-1',
      clinicId: 'clinic-1',
      professionalId: 'professional-1',
      originalProfessionalId: 'professional-owner',
      coverageId: 'coverage-1',
      paymentTransactionId: 'pay-123',
      provider: 'asaas',
      credentialsId: 'cred-1',
      sandboxMode: false,
      bankAccountId: 'bank-1',
      settledAt,
      baseAmountCents: 20000,
      netAmountCents: 18000,
      remainderCents: 0,
      currency: 'BRL',
      gatewayStatus: 'RECEIVED_IN_ADVANCE',
      eventType: 'PAYMENT_CONFIRMED',
      fingerprint: 'fp-123',
      payloadId: 'asaas-evt-1',
      sandbox: false,
    });
    expect(event.payload.split).toHaveLength(4);
    expect(event.payload.requestedAt).toBeInstanceOf(Date);
  });
});
