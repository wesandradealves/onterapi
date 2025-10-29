import { BookingHold } from '@domain/scheduling/types/scheduling.types';
import { BookingHoldPresenter } from '@modules/scheduling/api/presenters/booking-hold.presenter';

const baseHold = (overrides: Partial<BookingHold> = {}): BookingHold => ({
  id: 'hold-1',
  tenantId: 'tenant-1',
  clinicId: 'clinic-1',
  professionalId: 'professional-1',
  originalProfessionalId: null,
  coverageId: null,
  patientId: 'patient-1',
  serviceTypeId: 'service-1',
  startAtUtc: new Date('2025-10-10T10:00:00Z'),
  endAtUtc: new Date('2025-10-10T11:00:00Z'),
  ttlExpiresAtUtc: new Date('2025-10-08T09:55:00Z'),
  status: 'active',
  createdAt: new Date('2025-10-08T09:00:00Z'),
  updatedAt: new Date('2025-10-08T09:00:00Z'),
  version: 1,
  ...overrides,
});

describe('BookingHoldPresenter', () => {
  it('converte hold para response DTO', () => {
    const hold = baseHold();

    const response = BookingHoldPresenter.toResponse(hold);

    expect(response.id).toBe(hold.id);
    expect(response.startAtUtc).toBe(hold.startAtUtc.toISOString());
    expect(response.ttlExpiresAtUtc).toBe(hold.ttlExpiresAtUtc.toISOString());
    expect(response.version).toBe(hold.version);
    expect(response.serviceTypeId).toBe(hold.serviceTypeId);
    expect(response.originalProfessionalId).toBeNull();
    expect(response.coverageId).toBeNull();
  });

  it('mantem informacoes de cobertura quando presentes', () => {
    const hold = baseHold({
      originalProfessionalId: 'professional-titular',
      coverageId: 'coverage-123',
    });

    const response = BookingHoldPresenter.toResponse(hold);

    expect(response.originalProfessionalId).toBe('professional-titular');
    expect(response.coverageId).toBe('coverage-123');
  });
});
