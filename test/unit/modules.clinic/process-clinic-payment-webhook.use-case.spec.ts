import { BadRequestException, NotFoundException } from '@nestjs/common';

import { ProcessClinicPaymentWebhookUseCase } from '../../../src/modules/clinic/use-cases/process-clinic-payment-webhook.use-case';
import { IClinicAppointmentRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-appointment.repository.interface';
import { IClinicHoldRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-hold.repository.interface';
import { ClinicAuditService } from '../../../src/infrastructure/clinic/services/clinic-audit.service';
import {
  ClinicAppointment,
  ClinicHold,
  ProcessClinicPaymentWebhookInput,
} from '../../../src/domain/clinic/types/clinic.types';

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
  let auditService: ClinicAuditService;
  let useCase: ProcessClinicPaymentWebhookUseCase;

  beforeEach(() => {
    appointmentRepository = {
      findByPaymentTransactionId: jest.fn(),
      updatePaymentStatus: jest.fn(),
    } as unknown as Mocked<IClinicAppointmentRepository>;

    holdRepository = {
      updatePaymentStatus: jest.fn(),
    } as unknown as Mocked<IClinicHoldRepository>;

    auditService = {
      register: jest.fn(),
    } as unknown as ClinicAuditService;

    useCase = new ProcessClinicPaymentWebhookUseCase(
      appointmentRepository,
      holdRepository,
      auditService,
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
      }),
    );
    expect(holdRepository.updatePaymentStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        holdId: appointment.holdId,
        paymentStatus: 'settled',
        gatewayStatus: 'RECEIVED_IN_ADVANCE',
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
      }),
    );
    expect(holdRepository.updatePaymentStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentStatus: 'refunded',
        gatewayStatus: 'REFUNDED',
        paidAt: input.receivedAt,
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
      }),
    );
    expect(holdRepository.updatePaymentStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentStatus: 'chargeback',
        gatewayStatus: 'CHARGEBACK_REQUESTED',
        paidAt: new Date(paymentDate),
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
  });
});
