import { ConfigService } from '@nestjs/config';

import { ClinicConfigurationTelemetryService } from '../../../src/modules/clinic/services/clinic-configuration-telemetry.service';
import { ClinicConfigurationCacheService } from '../../../src/modules/clinic/services/clinic-configuration-cache.service';
import { GetClinicGeneralSettingsUseCase } from '../../../src/modules/clinic/use-cases/get-clinic-general-settings.use-case';
import {
  Clinic,
  ClinicConfigurationSection,
  ClinicConfigurationVersion,
} from '../../../src/domain/clinic/types/clinic.types';

const clinicRepositoryMock = () => ({
  findByTenant: jest.fn(),
});

const configurationRepositoryMock = () => ({
  findLatestAppliedVersion: jest.fn(),
});

describe('GetClinicGeneralSettingsUseCase', () => {
  let clinicRepository: ReturnType<typeof clinicRepositoryMock>;
  let configurationRepository: ReturnType<typeof configurationRepositoryMock>;
  let telemetryService: ClinicConfigurationTelemetryService;
  let cacheService: ClinicConfigurationCacheService;
  let useCase: GetClinicGeneralSettingsUseCase;
  let clinic: Clinic;
  let version: ClinicConfigurationVersion;

  beforeEach(() => {
    clinicRepository = clinicRepositoryMock();
    configurationRepository = configurationRepositoryMock();
    cacheService = new ClinicConfigurationCacheService(new ConfigService());
    telemetryService = new ClinicConfigurationTelemetryService(
      clinicRepository as any,
      cacheService,
    );
    useCase = new GetClinicGeneralSettingsUseCase(
      clinicRepository as any,
      configurationRepository as any,
      telemetryService,
      cacheService,
    );

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
      createdAt: new Date(),
      updatedAt: new Date(),
      configurationTelemetry: {
        general: {
          section: 'general',
          state: 'saved',
          completionScore: 80,
          lastSavedAt: new Date('2025-01-01T12:00:00Z'),
        },
      },
    } as Clinic;

    version = {
      id: 'version-1',
      clinicId: 'clinic-1',
      section: 'general' as ClinicConfigurationSection,
      version: 2,
      payload: { tradeName: 'Onterapi' },
      createdBy: 'user-1',
      createdAt: new Date('2025-01-01T10:00:00Z'),
      appliedAt: new Date('2025-01-01T11:00:00Z'),
      autoApply: true,
    };

    clinicRepository.findByTenant.mockResolvedValue(clinic);
    configurationRepository.findLatestAppliedVersion.mockResolvedValue(version);
  });

  afterEach(async () => {
    await cacheService.onModuleDestroy();
  });

  it('returns configuration with telemetry and caches result', async () => {
    const first = await useCase.executeOrThrow({ tenantId: 'tenant-1', clinicId: 'clinic-1' });

    expect(first.telemetry).toEqual(
      expect.objectContaining({ state: 'saved', completionScore: 80 }),
    );
    expect(configurationRepository.findLatestAppliedVersion).toHaveBeenCalledTimes(1);

    const second = await useCase.executeOrThrow({ tenantId: 'tenant-1', clinicId: 'clinic-1' });
    expect(configurationRepository.findLatestAppliedVersion).toHaveBeenCalledTimes(1);
    expect(second.telemetry).toEqual(first.telemetry);
  });
});
