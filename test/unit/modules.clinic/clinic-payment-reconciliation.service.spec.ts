import { ClinicPaymentReconciliationService } from '../../../src/modules/clinic/services/clinic-payment-reconciliation.service';
import {
  ClinicPaymentChargebackEvent,
  ClinicPaymentFailedEvent,
  ClinicPaymentRefundedEvent,
  ClinicPaymentSettledEvent,
} from '../../../src/modules/clinic/services/clinic-payment-event.types';
import { ClinicPaymentNotificationService } from '../../../src/modules/clinic/services/clinic-payment-notification.service';
import { ClinicPaymentPayoutService } from '../../../src/modules/clinic/services/clinic-payment-payout.service';
import { IClinicAppointmentRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-appointment.repository.interface';
import { IClinicConfigurationRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-configuration.repository.interface';
import { ClinicAuditService } from '../../../src/infrastructure/clinic/services/clinic-audit.service';
import { ClinicAppointment } from '../../../src/domain/clinic/types/clinic.types';
import { DomainEvents } from '../../../src/shared/events/domain-events';

type Mocked<T> = jest.Mocked<T>;

const createAppointment = (overrides: Partial<ClinicAppointment> = {}): ClinicAppointment => {
  const { metadata: metadataOverride, ...rest } = overrides;

  const baseMetadata: Record<string, unknown> = {
    professionalPolicy: {
      policyId: 'policy-1',
      channelScope: 'direct',
      sourceInvitationId: 'inv-1',
      acceptedBy: 'professional-1',
      effectiveAt: '2098-12-01T00:00:00.000Z',
      updatedAt: '2098-12-01T00:00:00.000Z',
      economicSummary: {
        items: [
          {
            serviceTypeId: 'service-1',
            price: 200,
            currency: 'BRL',
            payoutModel: 'percentage',
            payoutValue: 50,
          },
        ],
        orderOfRemainders: ['taxes', 'gateway', 'clinic', 'professional', 'platform'],
        roundingStrategy: 'half_even',
      },
    },
    coverage: {
      coverageId: 'coverage-1',
      originalProfessionalId: 'professional-owner',
    },
  };

  const metadata =
    metadataOverride && typeof metadataOverride === 'object'
      ? { ...baseMetadata, ...metadataOverride }
      : (JSON.parse(JSON.stringify(baseMetadata)) as Record<string, unknown>);

  return {
    id: 'appointment-1',
    clinicId: 'clinic-1',
    tenantId: 'tenant-1',
    holdId: 'hold-1',
    professionalId: 'professional-1',
    originalProfessionalId: 'professional-owner',
    coverageId: null,
    patientId: 'patient-1',
    serviceTypeId: 'service-1',
    start: new Date('2099-01-01T12:00:00Z'),
    end: new Date('2099-01-01T13:00:00Z'),
    status: 'scheduled',
    paymentStatus: 'settled',
    paymentTransactionId: 'pay-123',
    confirmedAt: new Date('2099-01-01T11:00:00Z'),
    createdAt: new Date('2099-01-01T10:30:00Z'),
    updatedAt: new Date('2099-01-01T10:30:00Z'),
    metadata,
    ...rest,
  };
};

const createSettlementEvent = (): ClinicPaymentSettledEvent => ({
  eventId: 'evt-1',
  eventName: DomainEvents.CLINIC_PAYMENT_SETTLED,
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
    gatewayStatus: 'RECEIVED_IN_ADVANCE',
    eventType: 'PAYMENT_CONFIRMED',
    sandbox: false,
    fingerprint: 'fp-123',
    payloadId: 'asaas-evt-1',
    amount: { value: 200, netValue: 180 },
    settledAt: new Date('2099-01-01T12:04:00Z'),
    processedAt: new Date('2099-01-01T12:05:00Z'),
  },
});

const createRefundEvent = (): ClinicPaymentRefundedEvent => ({
  eventId: 'evt-refund',
  eventName: DomainEvents.CLINIC_PAYMENT_REFUNDED,
  aggregateId: 'appointment-1',
  occurredOn: new Date('2099-01-02T12:05:00Z'),
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
    gatewayStatus: 'REFUNDED',
    eventType: 'PAYMENT_REFUNDED',
    sandbox: false,
    fingerprint: 'fp-refund',
    payloadId: 'asaas-evt-refund',
    amount: { value: 200, netValue: 180 },
    refundedAt: new Date('2099-01-02T12:04:00Z'),
    processedAt: new Date('2099-01-02T12:05:00Z'),
  },
});

const createChargebackEvent = (): ClinicPaymentChargebackEvent => ({
  eventId: 'evt-chargeback',
  eventName: DomainEvents.CLINIC_PAYMENT_CHARGEBACK,
  aggregateId: 'appointment-1',
  occurredOn: new Date('2099-01-03T12:05:00Z'),
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
    gatewayStatus: 'CHARGEBACK',
    eventType: 'PAYMENT_CHARGEBACK',
    sandbox: false,
    fingerprint: 'fp-chargeback',
    payloadId: 'asaas-evt-chargeback',
    amount: { value: 200, netValue: 180 },
    chargebackAt: new Date('2099-01-03T12:04:00Z'),
    processedAt: new Date('2099-01-03T12:05:00Z'),
  },
});

const createFailedEvent = (): ClinicPaymentFailedEvent => ({
  eventId: 'evt-failed',
  eventName: DomainEvents.CLINIC_PAYMENT_FAILED,
  aggregateId: 'appointment-1',
  occurredOn: new Date('2099-01-04T08:05:00Z'),
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
    gatewayStatus: 'OVERDUE',
    eventType: 'PAYMENT_OVERDUE',
    sandbox: false,
    fingerprint: 'fp-failed',
    payloadId: 'asaas-evt-failed',
    amount: { value: 200, netValue: 0 },
    failedAt: new Date('2099-01-04T08:00:00Z'),
    processedAt: new Date('2099-01-04T08:05:00Z'),
    reason: 'Pagamento nao compensado',
  },
});

describe('ClinicPaymentReconciliationService', () => {
  let appointmentRepository: Mocked<IClinicAppointmentRepository>;
  let configurationRepository: Mocked<IClinicConfigurationRepository>;
  let auditService: ClinicAuditService;
  let paymentNotificationService: Mocked<ClinicPaymentNotificationService>;
  let paymentPayoutService: Mocked<ClinicPaymentPayoutService>;
  let service: ClinicPaymentReconciliationService;

  beforeEach(() => {
    appointmentRepository = {
      findById: jest.fn(),
      updateMetadata: jest.fn(),
    } as unknown as Mocked<IClinicAppointmentRepository>;

    configurationRepository = {
      findLatestAppliedVersion: jest.fn(),
    } as unknown as Mocked<IClinicConfigurationRepository>;

    auditService = {
      register: jest.fn(),
    } as unknown as ClinicAuditService;

    paymentNotificationService = {
      notifySettlement: jest.fn(),
      notifyRefund: jest.fn(),
      notifyChargeback: jest.fn(),
      notifyFailure: jest.fn(),
    } as unknown as Mocked<ClinicPaymentNotificationService>;

    paymentPayoutService = {
      requestPayout: jest.fn(),
    } as unknown as Mocked<ClinicPaymentPayoutService>;

    service = new ClinicPaymentReconciliationService(
      appointmentRepository,
      configurationRepository,
      auditService,
      paymentNotificationService,
      paymentPayoutService,
    );

    configurationRepository.findLatestAppliedVersion.mockResolvedValue({
      id: 'version-1',
      clinicId: 'clinic-1',
      section: 'payments',
      version: 1,
      payload: {
        paymentSettings: {
          provider: 'asaas',
          credentialsId: 'cred-1',
          sandboxMode: false,
          splitRules: [
            { recipient: 'taxes', percentage: 5, order: 1 },
            { recipient: 'gateway', percentage: 3, order: 2 },
            { recipient: 'clinic', percentage: 52, order: 3 },
            { recipient: 'professional', percentage: 40, order: 4 },
          ],
          roundingStrategy: 'half_even',
          antifraud: { enabled: false },
          inadimplencyRule: { gracePeriodDays: 0, actions: [] },
          refundPolicy: {
            type: 'manual',
            processingTimeHours: 0,
            allowPartialRefund: false,
          },
          cancellationPolicies: [],
        },
      },
      createdBy: 'user-1',
      createdAt: new Date('2099-01-01T08:00:00Z'),
    });
  });

  it('registra liquidacao com split financeiro e auditoria', async () => {
    appointmentRepository.findById.mockResolvedValue(createAppointment());

    await service.handlePaymentSettled(createSettlementEvent());

    expect(appointmentRepository.updateMetadata).toHaveBeenCalledTimes(1);
    const patch = appointmentRepository.updateMetadata.mock.calls[0][0].metadataPatch
      .paymentLedger as Record<string, unknown>;

    expect(patch.settlement).toMatchObject({
      baseAmountCents: 20000,
      netAmountCents: 18000,
      gatewayStatus: 'RECEIVED_IN_ADVANCE',
      fingerprint: 'fp-123',
      split: expect.arrayContaining([
        expect.objectContaining({ recipient: 'taxes', amountCents: 833 }),
        expect.objectContaining({ recipient: 'gateway', amountCents: 500 }),
        expect.objectContaining({ recipient: 'clinic', amountCents: 8667 }),
        expect.objectContaining({ recipient: 'professional', amountCents: 10000 }),
      ]),
    });

    expect(auditService.register).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'clinic.payment.settlement_recorded',
        detail: expect.objectContaining({
          baseAmountCents: 20000,
          netAmountCents: 18000,
          fingerprint: 'fp-123',
          professionalPolicyId: 'policy-1',
          split: expect.arrayContaining([
            expect.objectContaining({ recipient: 'taxes', amountCents: 833 }),
            expect.objectContaining({ recipient: 'gateway', amountCents: 500 }),
            expect.objectContaining({ recipient: 'clinic', amountCents: 8667 }),
            expect.objectContaining({ recipient: 'professional', amountCents: 10000 }),
          ]),
        }),
      }),
    );

    expect(paymentPayoutService.requestPayout).toHaveBeenCalledTimes(1);
    expect(paymentPayoutService.requestPayout).toHaveBeenCalledWith(
      expect.objectContaining({
        appointmentId: 'appointment-1',
        tenantId: 'tenant-1',
        clinicId: 'clinic-1',
        originalProfessionalId: 'professional-owner',
        coverageId: 'coverage-1',
        paymentTransactionId: 'pay-123',
        provider: 'asaas',
        settlement: expect.objectContaining({
          baseAmountCents: 20000,
          split: expect.arrayContaining([
            expect.objectContaining({ recipient: 'clinic' }),
            expect.objectContaining({ recipient: 'professional' }),
          ]),
        }),
      }),
    );

    expect(paymentNotificationService.notifySettlement).toHaveBeenCalledWith(
      expect.objectContaining({
        appointment: expect.objectContaining({ id: 'appointment-1' }),
        event: expect.objectContaining({ eventName: DomainEvents.CLINIC_PAYMENT_SETTLED }),
      }),
    );
  });

  it('propaga identificadores de cobertura nulos quando metadata nao possui coverage', async () => {
    appointmentRepository.findById.mockResolvedValue(
      createAppointment({ metadata: { coverage: null } }),
    );

    await service.handlePaymentSettled(createSettlementEvent());

    expect(paymentPayoutService.requestPayout).toHaveBeenCalledTimes(1);
    const payoutRequest = paymentPayoutService.requestPayout.mock.calls[0][0];
    expect(payoutRequest.originalProfessionalId).toBeNull();
    expect(payoutRequest.coverageId).toBeNull();
  });

  it('nao replica liquidacao com fingerprint repetido', async () => {
    appointmentRepository.findById.mockResolvedValue(
      createAppointment({
        metadata: {
          paymentLedger: {
            settlement: {
              settledAt: '2099-01-01T12:04:00.000Z',
              baseAmountCents: 20000,
              remainderCents: 0,
              gatewayStatus: 'RECEIVED_IN_ADVANCE',
              fingerprint: 'fp-123',
              split: [],
            },
            events: [
              {
                type: 'settled',
                gatewayStatus: 'RECEIVED_IN_ADVANCE',
                recordedAt: '2099-01-01T12:05:00.000Z',
                fingerprint: 'fp-123',
                sandbox: false,
              },
            ],
            currency: 'BRL',
            lastUpdatedAt: '2099-01-01T12:05:00.000Z',
          },
        },
      }),
    );

    await service.handlePaymentSettled(createSettlementEvent());

    expect(appointmentRepository.updateMetadata).not.toHaveBeenCalled();
    expect(auditService.register).not.toHaveBeenCalled();
    expect(paymentPayoutService.requestPayout).not.toHaveBeenCalled();
    expect(paymentNotificationService.notifySettlement).not.toHaveBeenCalled();
  });

  it('registra reembolso e dispara notificacao', async () => {
    appointmentRepository.findById.mockResolvedValue(createAppointment());

    await service.handlePaymentRefunded(createRefundEvent());

    expect(appointmentRepository.updateMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        appointmentId: 'appointment-1',
        metadataPatch: expect.objectContaining({
          paymentLedger: expect.objectContaining({
            refund: expect.objectContaining({
              gatewayStatus: 'REFUNDED',
              fingerprint: 'fp-refund',
            }),
          }),
        }),
      }),
    );

    expect(auditService.register).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'clinic.payment.refund_recorded',
        detail: expect.objectContaining({
          appointmentId: 'appointment-1',
          paymentTransactionId: 'pay-123',
        }),
      }),
    );

    expect(paymentNotificationService.notifyRefund).toHaveBeenCalledWith(
      expect.objectContaining({
        appointment: expect.objectContaining({ id: 'appointment-1' }),
        event: expect.objectContaining({ eventName: DomainEvents.CLINIC_PAYMENT_REFUNDED }),
      }),
    );
    expect(paymentPayoutService.requestPayout).not.toHaveBeenCalled();
  });

  it('registra chargeback e dispara notificacao', async () => {
    appointmentRepository.findById.mockResolvedValue(createAppointment());

    await service.handlePaymentChargeback(createChargebackEvent());

    expect(appointmentRepository.updateMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        appointmentId: 'appointment-1',
        metadataPatch: expect.objectContaining({
          paymentLedger: expect.objectContaining({
            chargeback: expect.objectContaining({
              gatewayStatus: 'CHARGEBACK',
              fingerprint: 'fp-chargeback',
            }),
          }),
        }),
      }),
    );

    expect(auditService.register).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'clinic.payment.chargeback_recorded',
        detail: expect.objectContaining({
          appointmentId: 'appointment-1',
          paymentTransactionId: 'pay-123',
        }),
      }),
    );

    expect(paymentNotificationService.notifyChargeback).toHaveBeenCalledWith(
      expect.objectContaining({
        appointment: expect.objectContaining({ id: 'appointment-1' }),
        event: expect.objectContaining({ eventName: DomainEvents.CLINIC_PAYMENT_CHARGEBACK }),
      }),
    );
    expect(paymentPayoutService.requestPayout).not.toHaveBeenCalled();
  });

  it('registra falha de pagamento e dispara notificacao', async () => {
    appointmentRepository.findById.mockResolvedValue(createAppointment());

    (appointmentRepository.updateMetadata as jest.Mock).mockClear();
    (auditService.register as jest.Mock).mockClear();
    paymentNotificationService.notifyFailure.mockClear();

    await service.handlePaymentFailed(createFailedEvent());

    expect(appointmentRepository.updateMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        appointmentId: 'appointment-1',
        metadataPatch: expect.objectContaining({
          paymentLedger: expect.objectContaining({
            events: expect.arrayContaining([
              expect.objectContaining({
                type: 'failed',
                gatewayStatus: 'OVERDUE',
                fingerprint: 'fp-failed',
              }),
            ]),
          }),
        }),
      }),
    );

    expect(auditService.register).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'clinic.payment.failure_recorded',
        detail: expect.objectContaining({
          appointmentId: 'appointment-1',
          paymentTransactionId: 'pay-123',
          gatewayStatus: 'OVERDUE',
        }),
      }),
    );

    expect(paymentNotificationService.notifyFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        appointment: expect.objectContaining({ id: 'appointment-1' }),
        event: expect.objectContaining({ eventName: DomainEvents.CLINIC_PAYMENT_FAILED }),
      }),
    );
    expect(paymentPayoutService.requestPayout).not.toHaveBeenCalled();
  });

  it('registra evento de status alterado', async () => {
    appointmentRepository.findById.mockResolvedValue(createAppointment());

    const statusEvent = {
      eventId: 'evt-status',
      eventName: DomainEvents.CLINIC_PAYMENT_STATUS_CHANGED,
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
        previousStatus: 'approved',
        newStatus: 'settled',
        gatewayStatus: 'RECEIVED_IN_ADVANCE',
        eventType: 'PAYMENT_CONFIRMED',
        sandbox: false,
        fingerprint: 'fp-status',
        payloadId: 'asaas-evt-status',
        amount: { value: 200, netValue: 180 },
        receivedAt: new Date('2099-01-01T12:03:00Z'),
        paidAt: new Date('2099-01-01T12:04:00Z'),
        processedAt: new Date('2099-01-01T12:05:00Z'),
      },
    } as ClinicPaymentStatusChangedEvent;

    await service.handleStatusChanged(statusEvent);

    expect(appointmentRepository.updateMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        appointmentId: 'appointment-1',
        metadataPatch: expect.objectContaining({
          paymentLedger: expect.objectContaining({
            events: expect.arrayContaining([
              expect.objectContaining({
                type: 'status_changed',
                fingerprint: 'fp-status',
              }),
            ]),
          }),
        }),
      }),
    );

    expect(auditService.register).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'clinic.payment.status_changed_recorded',
        detail: expect.objectContaining({
          previousStatus: 'approved',
          newStatus: 'settled',
        }),
      }),
    );

    expect(paymentNotificationService.notifySettlement).not.toHaveBeenCalled();
    expect(paymentNotificationService.notifyRefund).not.toHaveBeenCalled();
    expect(paymentNotificationService.notifyChargeback).not.toHaveBeenCalled();
    expect(paymentPayoutService.requestPayout).not.toHaveBeenCalled();
  });
});
