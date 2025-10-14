import { ClinicConfigurationCacheService } from '../../../src/modules/clinic/services/clinic-configuration-cache.service';
import { ClinicConfigurationVersion } from '../../../src/domain/clinic/types/clinic.types';

describe('ClinicConfigurationCacheService', () => {
  let service: ClinicConfigurationCacheService;
  const version: ClinicConfigurationVersion = {
    id: 'v1',
    clinicId: 'clinic-1',
    section: 'general',
    version: 1,
    payload: { generalSettings: { tradeName: 'Onterapi' } },
    createdBy: 'user-1',
    createdAt: new Date('2025-01-01T10:00:00Z'),
    autoApply: true,
    telemetry: {
      section: 'general',
      state: 'saved',
      completionScore: 90,
      lastAttemptAt: new Date('2025-01-01T10:01:00Z'),
      lastSavedAt: new Date('2025-01-01T10:01:30Z'),
      lastUpdatedBy: 'user-1',
    },
  };

  beforeEach(() => {
    service = new ClinicConfigurationCacheService();
  });

  it('returns undefined for cache miss', () => {
    const cached = service.get({ tenantId: 'tenant-1', clinicId: 'clinic-1', section: 'general' });
    expect(cached).toBeUndefined();
  });

  it('stores and retrieves cloned versions', () => {
    service.set({ tenantId: 'tenant-1', clinicId: 'clinic-1', section: 'general', version });

    const cached = service.get({ tenantId: 'tenant-1', clinicId: 'clinic-1', section: 'general' });

    expect(cached).toBeDefined();
    expect(cached).not.toBe(version);
    expect(cached?.telemetry).toEqual(version.telemetry);

    cached!.payload['mutated'] = true;

    const cachedAgain = service.get({
      tenantId: 'tenant-1',
      clinicId: 'clinic-1',
      section: 'general',
    });
    expect(cachedAgain?.payload).not.toHaveProperty('mutated');
  });

  it('invalidates entries and respects ttl', () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    service.set({ tenantId: 'tenant-1', clinicId: 'clinic-1', section: 'general', version });

    nowSpy.mockReturnValue(1_700_000_000_000 + 9 * 60 * 1000);
    expect(
      service.get({ tenantId: 'tenant-1', clinicId: 'clinic-1', section: 'general' }),
    ).toBeDefined();

    nowSpy.mockReturnValue(1_700_000_000_000 + 11 * 60 * 1000);
    expect(
      service.get({ tenantId: 'tenant-1', clinicId: 'clinic-1', section: 'general' }),
    ).toBeUndefined();

    service.set({ tenantId: 'tenant-1', clinicId: 'clinic-1', section: 'general', version });
    service.invalidate({ tenantId: 'tenant-1', clinicId: 'clinic-1', section: 'general' });
    expect(
      service.get({ tenantId: 'tenant-1', clinicId: 'clinic-1', section: 'general' }),
    ).toBeUndefined();

    nowSpy.mockRestore();
  });
});
