import { Booking } from '@domain/scheduling/types/scheduling.types';
import { BookingPresenter } from '@modules/scheduling/api/presenters/booking.presenter';

const baseBooking = (overrides: Partial<Booking> = {}): Booking => ({
  id: 'booking-1',
  tenantId: 'tenant-1',
  clinicId: 'clinic-1',
  professionalId: 'professional-1',
  originalProfessionalId: null,
  coverageId: null,
  patientId: 'patient-1',
  source: 'direct',
  status: 'scheduled',
  paymentStatus: 'approved',
  holdId: 'hold-1',
  holdExpiresAtUtc: new Date('2025-10-10T09:55:00Z'),
  startAtUtc: new Date('2025-10-10T10:00:00Z'),
  endAtUtc: new Date('2025-10-10T11:00:00Z'),
  timezone: 'America/Sao_Paulo',
  lateToleranceMinutes: 10,
  recurrenceSeriesId: null,
  cancellationReason: null,
  pricingSplit: null,
  preconditionsPassed: true,
  anamneseRequired: false,
  anamneseOverrideReason: null,
  noShowMarkedAtUtc: null,
  createdAt: new Date('2025-10-08T09:00:00Z'),
  updatedAt: new Date('2025-10-08T09:00:00Z'),
  version: 1,
  ...overrides,
});

describe('BookingPresenter', () => {
  it('converte booking para response DTO incluindo campos de cobertura nulos', () => {
    const booking = baseBooking();

    const response = BookingPresenter.toResponse(booking);

    expect(response.id).toBe(booking.id);
    expect(response.originalProfessionalId).toBeNull();
    expect(response.coverageId).toBeNull();
  });

  it('preserva valores de cobertura quando informados', () => {
    const booking = baseBooking({
      originalProfessionalId: 'professional-titular',
      coverageId: 'coverage-xyz',
    });

    const response = BookingPresenter.toResponse(booking);

    expect(response.originalProfessionalId).toBe('professional-titular');
    expect(response.coverageId).toBe('coverage-xyz');
  });
});
