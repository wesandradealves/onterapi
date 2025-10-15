import { BadRequestException, NotFoundException } from '@nestjs/common';

import { ProcessClinicPaymentWebhookUseCase } from '../../../src/modules/clinic/use-cases/process-clinic-payment-webhook.use-case';
import { IClinicAppointmentRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-appointment.repository.interface';
import { IClinicHoldRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-hold.repository.interface';
import { IClinicPaymentWebhookEventRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-payment-webhook-event.repository.interface';
import { ClinicAuditService } from '../../../src/infrastructure/clinic/services/clinic-audit.service';
import {
  ClinicAppointment,
  ClinicHold,
  ProcessClinicPaymentWebhookInput,
} from '../../../src/domain/clinic/types/clinic.types';
import { MessageBus } from '../../../src/shared/messaging/message-bus';
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
  end: new Date('2099-01-01T12:50:00Z'),
  status: 'scheduled',
  paymentStatus: 'approved',
  paymentTransactionId: 'pay-123',
  confirmedAt: new Date('2099-01-01T11:00:00Z'),
  createdAt: new Date('2099-01-01T10:00:00Z'),
  updatedAt: new Date('2099-01-01T10:00:00Z'),
  metadata: {},
  ...overrides,
});

const baseHold: ClinicHold = {
  id: 'hold-1',
  clinicId: 'clinic-1',
  tenantId: 'tenant-1',
  professionalId: 'professional-1',
  patientId: 'patient-1',
  serviceTypeId: 'service-1',
  start: new Date('2099-01-01T12:00:00Z'),
  end: new Date('2099-01-01T12:50:00Z'),
  ttlExpiresAt: new Date('2099-01-01T11:30:00Z'),
  status: 'confirmed',
  idempotencyKey: 'hold-key',
  createdBy: 'user-1',
  createdAt: new Date('2099-01-01T09:00:00Z'),
  updatedAt: new Date('2099-01-01T10:30:00Z'),
};

const createInput = (
  overrides: Partial<ProcessClinicPaymentWebhookInput> = {},
): ProcessClinicPaymentWebhookInput => ({
  provider: 'asaas',
  receivedAt: new Date('2099-01-01T12:05:00Z'),
  payload: {
    event: 'PAYMENT_CONFIRMED',
    sandbox: false,
    payment: {
      id: 'pay-123',
      status: 'CONFIRMED',
      paymentDate: '2099-01-01',
      value: 200,
      netValue: 180,
    },
  },
  ...overrides,
});

describe('ProcessClinicPaymentWebhookUseCase', () => {
  let appointmentRepository: Mocked<IClinicAppointmentRepository>;
  let holdRepository: Mocked<IClinicHoldRepository>;
  let webhookEventRepository: Mocked<IClinicPaymentWebhookEventRepository>;
  let auditService: ClinicAuditService;
  let messageBus: Mocked<MessageBus>;
  let useCase: ProcessClinicPaymentWebhookUseCase;

  beforeEach(() => {
    appointmentRepository = {
      findByPaymentTransactionId: jest.fn(),
      updatePaymentStatus: jest.fn(),
    } as unknown as Mocked<IClinicAppointmentRepository>;

    holdRepository = {
      updatePaymentStatus: jest.fn(),
    } as unknown as Mocked<IClinicHoldRepository>;

    webhookEventRepository = {
      exists: jest.fn().mockResolvedValue(false),
      record: jest.fn().mockResolvedValue({
        id: 'event-1',
        tenantId: 'tenant-1',
        clinicId: 'clinic-1',
        provider: 'asaas',
        paymentTransactionId: 'pay-123',
        fingerprint: 'fingerprint-1',
        appointmentId: 'appointment-1',
        eventType: 'PAYMENT_CONFIRMED',
        gatewayStatus: 'CONFIRMED',
        payloadId: 'payload-1',
        sandbox: false,
        receivedAt: new Date(),
        processedAt: new Date(),
        expiresAt: new Date(),
        createdAt: new Date(),
      }),
      purgeExpired: jest.fn().mockResolvedValue(0),
    } as unknown as Mocked<IClinicPaymentWebhookEventRepository>;

    auditService = {
      register: jest.fn(),
    } as unknown as ClinicAuditService;

    messageBus = {
      publish: jest.fn().mockResolvedValue(undefined),
      publishMany: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    } as unknown as Mocked<MessageBus>;

    useCase = new ProcessClinicPaymentWebhookUseCase(
      appointmentRepository,
      holdRepository,
      webhookEventRepository,
      auditService,
      messageBus,
    );
  });

  it('deve atualizar status de pagamento para settled e registrar auditoria', async () => {
    const appointment = createAppointment({ paymentStatus: 'approved' });
    appointmentRepository.findByPaymentTransactionId.mockResolvedValue(appointment);
    appointmentRepository.updatePaymentStatus.mockImplementation(async () =>
      createAppointment({ paymentStatus: 'settled' }),
    );
    holdRepository.updatePaymentStatus.mockResolvedValue({
      ...baseHold,
      metadata: { paymentStatus: 'settled' },
    } as ClinicHold);

    const input = createInput({
      payload: {
        event: 'PAYMENT_RECEIVED_IN_ADVANCE',
        payment: {
          id: 'pay-123',
          status: 'RECEIVED_IN_ADVANCE',
          paymentDate: '2099-01-01T12:01:00Z',
          value: 200,
          netValue: 180,
        },
      },
    });

    await useCase.executeOrThrow(input);

    expect(appointmentRepository.findByPaymentTransactionId).toHaveBeenCalledWith('pay-123');
    expect(appointmentRepository.updatePaymentStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        appointmentId: appointment.id,
        paymentStatus: 'settled',
        gatewayStatus: 'RECEIVED_IN_ADVANCE',
        eventFingerprint: expect.any(String),
      }),
    );
    expect(holdRepository.updatePaymentStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        holdId: appointment.holdId,
        paymentStatus: 'settled',
        gatewayStatus: 'RECEIVED_IN_ADVANCE',
        eventFingerprint: expect.any(String),
      }),
    );
    expect(auditService.register).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'clinic.payment.webhook_processed',
        clinicId: appointment.clinicId,
        tenantId: appointment.tenantId,
        detail: expect.objectContaining({
          paymentTransactionId: 'pay-123',
          previousStatus: 'approved',
          newStatus: 'settled',
          gatewayStatus: 'RECEIVED_IN_ADVANCE',
          event: 'PAYMENT_RECEIVED_IN_ADVANCE',
        }),
      }),
    );
    expect(messageBus.publish).toHaveBeenCalledTimes(2);
    const eventNames = messageBus.publish.mock.calls.map(([event]) => event.eventName);
    expect(eventNames).toContain(DomainEvents.CLINIC_PAYMENT_STATUS_CHANGED);
    expect(eventNames).toContain(DomainEvents.CLINIC_PAYMENT_SETTLED);
    expect(webhookEventRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: appointment.tenantId,
        clinicId: appointment.clinicId,
        paymentTransactionId: 'pay-123',
        fingerprint: expect.any(String),
      }),
    );
  });

  it('deve falhar quando status ASAAS for desconhecido', async () => {
    const input = createInput({
      payload: {
        event: 'UNKNOWN_EVENT',
        payment: {
          id: 'pay-unknown',
          status: 'DESCONHECIDO',
        },
      },
    });

    await expect(useCase.executeOrThrow(input)).rejects.toBeInstanceOf(BadRequestException);
    expect(appointmentRepository.findByPaymentTransactionId).not.toHaveBeenCalled();
  });

  it('deve falhar quando agendamento nao for encontrado', async () => {
    appointmentRepository.findByPaymentTransactionId.mockResolvedValue(null);

    const input = createInput();

    await expect(useCase.executeOrThrow(input)).rejects.toBeInstanceOf(NotFoundException);
    expect(appointmentRepository.updatePaymentStatus).not.toHaveBeenCalled();
    expect(holdRepository.updatePaymentStatus).not.toHaveBeenCalled();
  });

  it('deve registrar reembolso e atualizar status para refunded', async () => {
    const appointment = createAppointment({ paymentStatus: 'settled' });
    appointmentRepository.findByPaymentTransactionId.mockResolvedValue(appointment);
    appointmentRepository.updatePaymentStatus.mockImplementation(async () =>
      createAppointment({ paymentStatus: 'refunded' }),
    );
    holdRepository.updatePaymentStatus.mockResolvedValue({
      ...baseHold,
      metadata: { paymentStatus: 'refunded' },
    } as ClinicHold);

    const input = createInput({
      receivedAt: new Date('2099-01-02T10:00:00Z'),
      payload: {
        event: 'PAYMENT_REFUNDED',
        payment: {
          id: 'pay-123',
          status: 'REFUNDED',
          netValue: 180,
          value: 200,
        },
      },
    });

    await useCase.executeOrThrow(input);

    expect(appointmentRepository.updatePaymentStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        appointmentId: appointment.id,
        paymentStatus: 'refunded',
        gatewayStatus: 'REFUNDED',
        paidAt: input.receivedAt,
        eventFingerprint: expect.any(String),
      }),
    );
    expect(holdRepository.updatePaymentStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentStatus: 'refunded',
        gatewayStatus: 'REFUNDED',
        paidAt: input.receivedAt,
        eventFingerprint: expect.any(String),
      }),
    );
    expect(auditService.register).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          paymentTransactionId: 'pay-123',
          previousStatus: 'settled',
          newStatus: 'refunded',
          gatewayStatus: 'REFUNDED',
        }),
      }),
    );
    expect(messageBus.publish).toHaveBeenCalledTimes(2);
    const refundEventNames = messageBus.publish.mock.calls.map(([event]) => event.eventName);
    expect(refundEventNames).toContain(DomainEvents.CLINIC_PAYMENT_STATUS_CHANGED);
    expect(refundEventNames).toContain(DomainEvents.CLINIC_PAYMENT_REFUNDED);
  });

  it('deve registrar chargeback e preservar paymentDate quando informado', async () => {
    const paymentDate = '2099-01-03T15:00:00Z';
    const appointment = createAppointment({ paymentStatus: 'approved' });
    appointmentRepository.findByPaymentTransactionId.mockResolvedValue(appointment);
    appointmentRepository.updatePaymentStatus.mockImplementation(async () =>
      createAppointment({ paymentStatus: 'chargeback' }),
    );
    holdRepository.updatePaymentStatus.mockResolvedValue({
      ...baseHold,
      metadata: { paymentStatus: 'chargeback' },
    } as ClinicHold);

    const input = createInput({
      payload: {
        event: 'PAYMENT_CHARGEBACK',
        payment: {
          id: 'pay-123',
          status: 'CHARGEBACK_REQUESTED',
          paymentDate,
        },
      },
    });

    await useCase.executeOrThrow(input);

    expect(appointmentRepository.updatePaymentStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        appointmentId: appointment.id,
        paymentStatus: 'chargeback',
        gatewayStatus: 'CHARGEBACK_REQUESTED',
        paidAt: new Date(paymentDate),
        eventFingerprint: expect.any(String),
      }),
    );
    expect(holdRepository.updatePaymentStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentStatus: 'chargeback',
        gatewayStatus: 'CHARGEBACK_REQUESTED',
        paidAt: new Date(paymentDate),
        eventFingerprint: expect.any(String),
      }),
    );
    expect(auditService.register).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          paymentTransactionId: 'pay-123',
          newStatus: 'chargeback',
          gatewayStatus: 'CHARGEBACK_REQUESTED',
        }),
      }),
    );
    expect(messageBus.publish).toHaveBeenCalledTimes(2);
    const chargebackEventNames = messageBus.publish.mock.calls.map(([event]) => event.eventName);
    expect(chargebackEventNames).toContain(DomainEvents.CLINIC_PAYMENT_STATUS_CHANGED);
    expect(chargebackEventNames).toContain(DomainEvents.CLINIC_PAYMENT_CHARGEBACK);
  });

  it('ignora webhook ja persistido em armazenamento dedicado', async () => {
    const appointment = createAppointment();
    appointmentRepository.findByPaymentTransactionId.mockResolvedValue(appointment);
    webhookEventRepository.exists.mockResolvedValue(true);

    await expect(useCase.executeOrThrow(createInput())).resolves.toBeUndefined();

    expect(appointmentRepository.updatePaymentStatus).not.toHaveBeenCalled();
    expect(holdRepository.updatePaymentStatus).not.toHaveBeenCalled();
    expect(webhookEventRepository.record).not.toHaveBeenCalled();
    expect(auditService.register).not.toHaveBeenCalled();
    expect(messageBus.publish).not.toHaveBeenCalled();
  });

  it('ignora evento duplicado ja processado', async () => {
    const appointment = createAppointment({
      metadata: {
        paymentGateway: {
          events: [{ fingerprint: 'pay-123:payment_confirmed:confirmed:' }],
        },
      },
    });
    appointmentRepository.findByPaymentTransactionId.mockResolvedValue(appointment);

    await expect(useCase.executeOrThrow(createInput())).resolves.toBeUndefined();

    expect(appointmentRepository.updatePaymentStatus).not.toHaveBeenCalled();
    expect(holdRepository.updatePaymentStatus).not.toHaveBeenCalled();
    expect(auditService.register).not.toHaveBeenCalled();
    expect(messageBus.publish).not.toHaveBeenCalled();
  });
});
