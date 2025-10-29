import { ClinicAppointment } from '../../../src/domain/clinic/types/clinic.types';
import { extractAppointmentCoverageContext } from '../../../src/modules/clinic/utils/clinic-appointment-metadata.util';

const createAppointment = (
  overrides: Partial<ClinicAppointment> = {},
  metadata: Record<string, unknown> | undefined = undefined,
): ClinicAppointment => ({
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
  paymentStatus: 'approved',
  paymentTransactionId: 'pay-123',
  confirmedAt: new Date('2099-01-01T11:00:00Z'),
  createdAt: new Date('2099-01-01T10:00:00Z'),
  updatedAt: new Date('2099-01-01T10:00:00Z'),
  metadata,
  ...overrides,
});

describe('extractAppointmentCoverageContext', () => {
  it('deve extrair ids do metadata de cobertura', () => {
    const appointment = createAppointment(undefined, {
      coverage: {
        coverageId: 'coverage-1',
        originalProfessionalId: 'professional-owner',
      },
    });

    const context = extractAppointmentCoverageContext(appointment);

    expect(context).toEqual({
      coverageId: 'coverage-1',
      originalProfessionalId: 'professional-owner',
    });
  });

  it('deve retornar null quando coverage nao esta presente', () => {
    const appointment = createAppointment(undefined, { other: 'value' });

    const context = extractAppointmentCoverageContext(appointment);

    expect(context).toEqual({
      coverageId: null,
      originalProfessionalId: null,
    });
  });

  it('deve normalizar strings vazias ou espacos para null', () => {
    const appointment = createAppointment(undefined, {
      coverage: {
        coverageId: '   ',
        originalProfessionalId: '',
      },
    });

    const context = extractAppointmentCoverageContext(appointment);

    expect(context).toEqual({
      coverageId: null,
      originalProfessionalId: null,
    });
  });

  it('deve ignorar valores nao string', () => {
    const appointment = createAppointment(undefined, {
      coverage: {
        coverageId: 123,
        originalProfessionalId: { value: 'prof' },
      },
    });

    const context = extractAppointmentCoverageContext(appointment);

    expect(context).toEqual({
      coverageId: null,
      originalProfessionalId: null,
    });
  });
});
