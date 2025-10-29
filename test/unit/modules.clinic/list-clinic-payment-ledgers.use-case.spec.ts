import { ListClinicPaymentLedgersUseCase } from '../../../src/modules/clinic/use-cases/list-clinic-payment-ledgers.use-case';
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

describe('ListClinicPaymentLedgersUseCase', () => {
  let appointmentRepository: Mocked<IClinicAppointmentRepository>;
  let useCase: ListClinicPaymentLedgersUseCase;

  beforeEach(() => {
    appointmentRepository = {
      listByClinic: jest.fn(),
    } as unknown as Mocked<IClinicAppointmentRepository>;

    useCase = new ListClinicPaymentLedgersUseCase(appointmentRepository);
  });

  it('lista agendamentos com ledger calculado', async () => {
    appointmentRepository.listByClinic.mockResolvedValue([
      createAppointment({
        metadata: {
          paymentLedger: {
            currency: 'BRL',
            lastUpdatedAt: '2099-01-01T12:00:00Z',
            events: [
              {
                type: 'settled',
                gatewayStatus: 'RECEIVED_IN_ADVANCE',
                recordedAt: '2099-01-01T12:00:00Z',
                sandbox: false,
              },
            ],
          },
        },
      }),
    ]);

    const result = await useCase.executeOrThrow({
      clinicId: 'clinic-1',
      tenantId: 'tenant-1',
      paymentStatuses: ['settled'],
      limit: 10,
    });

    expect(appointmentRepository.listByClinic).toHaveBeenCalledWith({
      clinicId: 'clinic-1',
      tenantId: 'tenant-1',
      paymentStatuses: ['settled'],
      fromConfirmedAt: undefined,
      toConfirmedAt: undefined,
      limit: 10,
      offset: undefined,
    });

    expect(result).toHaveLength(1);
    expect(result[0].ledger.events).toHaveLength(1);
    expect(result[0].paymentStatus).toBe('settled');
  });
});
