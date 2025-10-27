import { ConfigService } from '@nestjs/config';

import { ClinicConfigurationTelemetryService } from '../../../src/modules/clinic/services/clinic-configuration-telemetry.service';
import { ClinicConfigurationCacheService } from '../../../src/modules/clinic/services/clinic-configuration-cache.service';
import { Clinic } from '../../../src/domain/clinic/types/clinic.types';

const repositoryMock = () => ({
  updateConfigurationTelemetry: jest.fn(),
});

describe('ClinicConfigurationTelemetryService', () => {
  let service: ClinicConfigurationTelemetryService;
  let clinic: Clinic;
  let repository: ReturnType<typeof repositoryMock>;
  let cacheService: ClinicConfigurationCacheService;

  beforeEach(() => {
    repository = repositoryMock();
    cacheService = new ClinicConfigurationCacheService(new ConfigService());
    service = new ClinicConfigurationTelemetryService(repository as any, cacheService);
    clinic = {
      id: 'clinic-1',
      tenantId: 'tenant-1',
      name: 'Clinic',
      slug: 'clinic',
      status: 'active',
      primaryOwnerId: 'owner-1',
      holdSettings: {
        ttlMinutes: 30,
        minAdvanceMinutes: 60,
        allowOverbooking: false,
        resourceMatchingStrict: true,
      },
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-01T00:00:00Z'),
    } as Clinic;
  });

  afterEach(async () => {
    await cacheService.onModuleDestroy();
  });

  it('marks saving and persists telemetry', async () => {
    const telemetry = await service.markSaving({
      clinic,
      section: 'general',
      requestedBy: 'user-1',
      payload: { tradeName: 'Onterapi' },
    });

    expect(telemetry.state).toBe('saving');
    expect(repository.updateConfigurationTelemetry).toHaveBeenCalledWith(
      expect.objectContaining({
        clinicId: 'clinic-1',
        telemetry: expect.objectContaining({ state: 'saving' }),
      }),
    );
  });

  it('marks saved, computes score and invalidates cache', async () => {
    await service.markSaving({
      clinic,
      section: 'general',
      requestedBy: 'user-1',
      payload: { tradeName: 'Onterapi' },
    });

    const telemetry = await service.markSaved({
      clinic,
      section: 'general',
      requestedBy: 'user-1',
      payload: {
        tradeName: 'Onterapi',
        address: { zipCode: '01001000', street: 'Street', city: 'City', state: 'SP' },
        contact: { email: 'contato@on.com', phone: '+5511988887777' },
      },
    });

    expect(telemetry.state).toBe('saved');
    expect(telemetry.completionScore).toBeGreaterThan(0);
  });

  it('marks error when operation fails', async () => {
    repository.updateConfigurationTelemetry.mockRejectedValueOnce(new Error('db-issue'));

    await expect(
      service.markSaving({ clinic, section: 'general', requestedBy: 'user-1', payload: {} }),
    ).rejects.toThrow('db-issue');
  });

  it('records error telemetry', async () => {
    await service.markSaving({ clinic, section: 'general', requestedBy: 'user-1', payload: {} });

    const telemetry = await service.markError({
      clinic,
      section: 'general',
      requestedBy: 'user-1',
      error: new Error('validation'),
    });

    expect(telemetry.state).toBe('error');
    expect(repository.updateConfigurationTelemetry).toHaveBeenCalledTimes(2);
  });

  it('ensures telemetry when missing', () => {
    const versionTelemetry = service.ensureTelemetry({
      clinic,
      section: 'general',
      payload: {
        tradeName: 'Onterapi',
        address: { zipCode: '01001000', street: 'Street', city: 'City', state: 'SP' },
        contact: { email: 'contato@on.com' },
      },
      appliedAt: new Date('2025-01-02T10:00:00Z'),
      createdBy: 'user-1',
      autoApply: true,
    });

    expect(versionTelemetry.state).toBe('saved');
    expect(versionTelemetry.completionScore).toBeGreaterThan(0);
  });
});
