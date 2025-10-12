import { NotFoundException } from '@nestjs/common';

import { GetClinicPaymentLedgerUseCase } from '../../../src/modules/clinic/use-cases/get-clinic-payment-ledger.use-case';
import { IClinicAppointmentRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-appointment.repository.interface';
import { ClinicAppointment } from '../../../src/domain/clinic/types/clinic.types';

type Mocked<T> = jest.Mocked<T>;

const createAppointment = (overrides: Partial<ClinicAppointment> = {}): ClinicAppointment => ({
  id: 'appointment-1',
  clinicId: 'clinic-1',
  tenantId: 'tenant-1',
  holdId: 'hold-1',
  professionalId: 'professional-1',
  patientId: 'patient-1',
  serviceTypeId: 'service-1',
  start: new Date('2099-01-01T10:00:00Z'),
  end: new Date('2099-01-01T11:00:00Z'),
  status: 'scheduled',
  paymentStatus: 'settled',
  paymentTransactionId: 'pay-123',
  confirmedAt: new Date('2099-01-01T09:00:00Z'),
  createdAt: new Date('2099-01-01T08:00:00Z'),
  updatedAt: new Date('2099-01-01T08:00:00Z'),
  metadata: {},
  ...overrides,
});

describe('GetClinicPaymentLedgerUseCase', () => {
  let appointmentRepository: Mocked<IClinicAppointmentRepository>;
  let useCase: GetClinicPaymentLedgerUseCase;

  beforeEach(() => {
    appointmentRepository = {
      findById: jest.fn(),
    } as unknown as Mocked<IClinicAppointmentRepository>;

    useCase = new GetClinicPaymentLedgerUseCase(appointmentRepository);
  });

  it('retorna ledger do agendamento quando encontrado', async () => {
    appointmentRepository.findById.mockResolvedValue(
      createAppointment({
        metadata: {
          paymentLedger: {
            currency: 'BRL',
            lastUpdatedAt: '2099-01-01T12:00:00.000Z',
            events: [
              {
                type: 'settled',
                gatewayStatus: 'RECEIVED_IN_ADVANCE',
                recordedAt: '2099-01-01T12:00:00.000Z',
                sandbox: false,
              },
            ],
            settlement: {
              settledAt: '2099-01-01T12:00:00.000Z',
              baseAmountCents: 20000,
              remainderCents: 0,
              gatewayStatus: 'RECEIVED_IN_ADVANCE',
              split: [],
            },
          },
        },
      }),
    );

    const result = await useCase.executeOrThrow({
      appointmentId: 'appointment-1',
      clinicId: 'clinic-1',
      tenantId: 'tenant-1',
    });

    expect(result.paymentTransactionId).toBe('pay-123');
    expect(result.ledger.events).toHaveLength(1);
    expect(result.ledger.settlement?.baseAmountCents).toBe(20000);
  });

  it('retorna ledger padrao quando metadados nao existem', async () => {
    appointmentRepository.findById.mockResolvedValue(
      createAppointment({ metadata: undefined }),
    );

    const result = await useCase.executeOrThrow({
      appointmentId: 'appointment-1',
      clinicId: 'clinic-1',
      tenantId: 'tenant-1',
    });

    expect(result.ledger.events).toHaveLength(0);
    expect(result.ledger.currency).toBe('BRL');
  });

  it('lança erro quando agendamento nao pertence a clinica/tenant', async () => {
    appointmentRepository.findById.mockResolvedValue(
      createAppointment({ clinicId: 'other-clinic' }),
    );

    await expect(
      useCase.executeOrThrow({
        appointmentId: 'appointment-1',
        clinicId: 'clinic-1',
        tenantId: 'tenant-1',
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
