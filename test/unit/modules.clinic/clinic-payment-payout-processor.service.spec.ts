import { ClinicPaymentPayoutProcessorService } from '../../../src/modules/clinic/services/clinic-payment-payout-processor.service';
import { IClinicPaymentPayoutRequestRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-payment-payout-request.repository.interface';
import { ClinicAuditService } from '../../../src/infrastructure/clinic/services/clinic-audit.service';
import { ClinicPaymentPayoutRequestedEvent } from '../../../src/modules/clinic/services/clinic-payment-event.types';
import { DomainEvents } from '../../../src/shared/events/domain-events';

const createEvent = (
  overrides: Partial<ClinicPaymentPayoutRequestedEvent['payload']> = {},
): ClinicPaymentPayoutRequestedEvent => ({
  eventId: 'evt-1',
  eventName: DomainEvents.BILLING_CLINIC_PAYMENT_PAYOUT_REQUESTED,
  aggregateId: 'appointment-1',
  occurredOn: new Date('2099-01-01T12:05:00Z'),
  metadata: {},
  payload: {
    appointmentId: 'appointment-1',
    tenantId: 'tenant-1',
    clinicId: 'clinic-1',
    professionalId: 'professional-1',
    patientId: 'patient-1',
    holdId: 'hold-1',
    serviceTypeId: 'service-1',
    paymentTransactionId: 'pay-123',
    provider: 'asaas',
    credentialsId: 'cred-1',
    sandboxMode: false,
    bankAccountId: 'bank-1',
    settledAt: new Date('2099-01-01T12:00:00Z'),
    baseAmountCents: 20000,
    netAmountCents: 18000,
    remainderCents: 0,
    split: [
      { recipient: 'clinic', percentage: 52, amountCents: 10400 },
      { recipient: 'professional', percentage: 40, amountCents: 8000 },
    ],
    currency: 'BRL',
    gatewayStatus: 'RECEIVED_IN_ADVANCE',
    eventType: 'PAYMENT_CONFIRMED',
    fingerprint: 'fp-123',
    payloadId: 'asaas-evt-1',
    sandbox: false,
    requestedAt: new Date('2099-01-01T12:04:00Z'),
    ...overrides,
  },
});

describe('ClinicPaymentPayoutProcessorService', () => {
  let repository: jest.Mocked<IClinicPaymentPayoutRequestRepository>;
  let auditService: jest.Mocked<ClinicAuditService>;
  let service: ClinicPaymentPayoutProcessorService;

  beforeEach(() => {
    repository = {
      enqueue: jest.fn(),
      existsByFingerprint: jest.fn(),
      existsByTransaction: jest.fn(),
      updateStatus: jest.fn(),
    } as unknown as jest.Mocked<IClinicPaymentPayoutRequestRepository>;

    auditService = {
      register: jest.fn(),
    } as unknown as jest.Mocked<ClinicAuditService>;

    service = new ClinicPaymentPayoutProcessorService(repository, auditService);

    repository.enqueue.mockImplementation(async (input) => ({
      id: 'payout-1',
      createdAt: new Date('2099-01-01T12:05:01Z'),
      updatedAt: new Date('2099-01-01T12:05:01Z'),
      attempts: 0,
      lastError: null,
      lastAttemptedAt: null,
      processedAt: null,
      status: 'pending',
      settledAt: input.settledAt,
      ...input,
    }));
  });

  it('enfileira nova solicitacao de payout e registra auditoria', async () => {
    repository.existsByFingerprint.mockResolvedValue(false);
    repository.existsByTransaction.mockResolvedValue(false);

    const event = createEvent();
    await service.handleEvent(event);

    expect(repository.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        appointmentId: 'appointment-1',
        paymentTransactionId: 'pay-123',
        settledAt: new Date('2099-01-01T12:00:00Z'),
        split: expect.arrayContaining([
          expect.objectContaining({ recipient: 'clinic', amountCents: 10400 }),
          expect.objectContaining({ recipient: 'professional', amountCents: 8000 }),
        ]),
      }),
    );

    expect(auditService.register).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'clinic.payment.payout_queued',
        clinicId: 'clinic-1',
        detail: expect.objectContaining({
          payoutId: 'payout-1',
          paymentTransactionId: 'pay-123',
        }),
      }),
    );
  });

  it('ignora evento duplicado por fingerprint', async () => {
    repository.existsByFingerprint.mockResolvedValue(true);

    await service.handleEvent(createEvent({ fingerprint: 'fp-123' }));

    expect(repository.enqueue).not.toHaveBeenCalled();
    expect(auditService.register).not.toHaveBeenCalled();
  });

  it('ignora evento duplicado por transacao', async () => {
    repository.existsByFingerprint.mockResolvedValue(false);
    repository.existsByTransaction.mockResolvedValue(true);

    await service.handleEvent(createEvent({ fingerprint: undefined }));

    expect(repository.enqueue).not.toHaveBeenCalled();
    expect(auditService.register).not.toHaveBeenCalled();
  });
});
