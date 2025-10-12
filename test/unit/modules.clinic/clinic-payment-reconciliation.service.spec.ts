import { ClinicPaymentReconciliationService } from '../../../src/modules/clinic/services/clinic-payment-reconciliation.service';
import { ClinicPaymentSettledEvent } from '../../../src/modules/clinic/services/clinic-payment-event.types';
import { IClinicAppointmentRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-appointment.repository.interface';
import { IClinicConfigurationRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-configuration.repository.interface';
import { ClinicAuditService } from '../../../src/infrastructure/clinic/services/clinic-audit.service';
import { ClinicAppointment } from '../../../src/domain/clinic/types/clinic.types';
import { DomainEvents } from '../../../src/shared/events/domain-events';

type Mocked<T> = jest.Mocked<T>;

const createAppointment = (overrides: Partial<ClinicAppointment> = {}): ClinicAppointment => ({
  id: 'appointment-1',
  clinicId: 'clinic-1',
  tenantId: 'tenant-1',
  holdId: 'hold-1',
  professionalId: 'professional-1',
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
  metadata: {},
  ...overrides,
});

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

describe('ClinicPaymentReconciliationService', () => {
  let appointmentRepository: Mocked<IClinicAppointmentRepository>;
  let configurationRepository: Mocked<IClinicConfigurationRepository>;
  let auditService: ClinicAuditService;
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

    service = new ClinicPaymentReconciliationService(
      appointmentRepository,
      configurationRepository,
      auditService,
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

  it('registra liquidação com split financeiro e auditoria', async () => {
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
        expect.objectContaining({ recipient: 'taxes', amountCents: 1000 }),
        expect.objectContaining({ recipient: 'gateway', amountCents: 600 }),
        expect.objectContaining({ recipient: 'clinic', amountCents: 10400 }),
        expect.objectContaining({ recipient: 'professional', amountCents: 8000 }),
      ]),
    });

    expect(auditService.register).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'clinic.payment.settlement_recorded',
        detail: expect.objectContaining({
          baseAmountCents: 20000,
          netAmountCents: 18000,
          fingerprint: 'fp-123',
        }),
      }),
    );
  });

  it('não replica liquidação com fingerprint repetido', async () => {
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
  });
});
