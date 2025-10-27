import { ConfigService } from '@nestjs/config';

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
    service = new ClinicConfigurationCacheService(new ConfigService());
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('returns undefined for cache miss', async () => {
    const cached = await service.get({
      tenantId: 'tenant-1',
      clinicId: 'clinic-1',
      section: 'general',
    });
    expect(cached).toBeUndefined();
  });

  it('stores and retrieves cloned versions', async () => {
    await service.set({ tenantId: 'tenant-1', clinicId: 'clinic-1', section: 'general', version });

    const cached = await service.get({
      tenantId: 'tenant-1',
      clinicId: 'clinic-1',
      section: 'general',
    });

    expect(cached).toBeDefined();
    expect(cached).not.toBe(version);
    expect(cached?.telemetry).toEqual(version.telemetry);

    cached!.payload['mutated'] = true;

    const cachedAgain = await service.get({
      tenantId: 'tenant-1',
      clinicId: 'clinic-1',
      section: 'general',
    });
    expect(cachedAgain?.payload).not.toHaveProperty('mutated');
  });

  it('invalidates entries and respects ttl', async () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    await service.set({ tenantId: 'tenant-1', clinicId: 'clinic-1', section: 'general', version });

    nowSpy.mockReturnValue(1_700_000_000_000 + 9 * 60 * 1000);
    expect(
      await service.get({ tenantId: 'tenant-1', clinicId: 'clinic-1', section: 'general' }),
    ).toBeDefined();

    nowSpy.mockReturnValue(1_700_000_000_000 + 11 * 60 * 1000);
    expect(
      await service.get({ tenantId: 'tenant-1', clinicId: 'clinic-1', section: 'general' }),
    ).toBeUndefined();

    await service.set({ tenantId: 'tenant-1', clinicId: 'clinic-1', section: 'general', version });
    await service.invalidate({ tenantId: 'tenant-1', clinicId: 'clinic-1', section: 'general' });
    expect(
      await service.get({ tenantId: 'tenant-1', clinicId: 'clinic-1', section: 'general' }),
    ).toBeUndefined();

    nowSpy.mockRestore();
  });
});
