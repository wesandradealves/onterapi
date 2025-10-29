import { GetClinicSecuritySettingsUseCase } from '../../../src/modules/clinic/use-cases/get-clinic-security-settings.use-case';
import { IClinicRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic.repository.interface';
import { IClinicConfigurationRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-configuration.repository.interface';
import { ClinicConfigurationTelemetryService } from '../../../src/modules/clinic/services/clinic-configuration-telemetry.service';
import { ClinicConfigurationCacheService } from '../../../src/modules/clinic/services/clinic-configuration-cache.service';
import { Clinic, ClinicConfigurationVersion } from '../../../src/domain/clinic/types/clinic.types';

type Mocked<T> = jest.Mocked<T>;

describe('GetClinicSecuritySettingsUseCase', () => {
  let clinicRepository: Mocked<IClinicRepository>;
  let configurationRepository: Mocked<IClinicConfigurationRepository>;
  let telemetryService: Mocked<ClinicConfigurationTelemetryService>;
  let cacheService: Mocked<ClinicConfigurationCacheService>;
  let useCase: GetClinicSecuritySettingsUseCase;

  beforeEach(() => {
    clinicRepository = {
      findByTenant: jest.fn(),
    } as unknown as Mocked<IClinicRepository>;

    configurationRepository = {
      findLatestAppliedVersion: jest.fn(),
    } as unknown as Mocked<IClinicConfigurationRepository>;

    telemetryService = {
      ensureTelemetry: jest.fn(),
    } as unknown as Mocked<ClinicConfigurationTelemetryService>;

    cacheService = {
      get: jest.fn(),
      set: jest.fn(),
    } as unknown as Mocked<ClinicConfigurationCacheService>;

    useCase = new GetClinicSecuritySettingsUseCase(
      clinicRepository,
      configurationRepository,
      telemetryService,
      cacheService,
    );
  });

  it('retorna configuracao de seguranca mesclando documentos de compliance do metadata', async () => {
    const clinic = {
      id: 'clinic-1',
      tenantId: 'tenant-1',
      metadata: {
        compliance: {
          documents: [
            {
              id: 'doc-1',
              type: 'CRM',
              status: 'valid',
              required: true,
              expiresAt: '2025-12-31T00:00:00.000Z',
              metadata: { issuer: 'CRM-SP' },
              updatedAt: '2025-01-05T10:00:00.000Z',
              updatedBy: 'auditor-1',
            },
            {
              type: 'LGPD',
              status: 'pending',
              required: false,
              expiresAt: null,
            },
          ],
        },
      },
    } as Clinic;

    const version: ClinicConfigurationVersion = {
      id: 'version-1',
      clinicId: 'clinic-1',
      section: 'security',
      version: 4,
      payload: {
        twoFactor: { enabled: true, requiredRoles: [], backupCodesEnabled: false },
      },
      createdBy: 'user-1',
      createdAt: new Date('2025-01-01T10:00:00Z'),
      autoApply: true,
    };

    cacheService.get.mockResolvedValue(undefined);
    clinicRepository.findByTenant.mockResolvedValue(clinic);
    configurationRepository.findLatestAppliedVersion.mockResolvedValue(version);
    telemetryService.ensureTelemetry.mockReturnValue({
      section: 'security',
      state: 'saved',
      completionScore: 1,
    });

    const result = await useCase.executeOrThrow({
      clinicId: 'clinic-1',
      tenantId: 'tenant-1',
    });

    expect(result.payload).toBeDefined();
    const payload = result.payload as Record<string, unknown>;
    const compliance = (payload.compliance as { documents: Array<Record<string, unknown>> }) ?? {};

    expect(compliance.documents).toHaveLength(2);
    expect(compliance.documents[0]).toMatchObject({
      id: 'doc-1',
      type: 'CRM',
      status: 'valid',
      required: true,
      updatedBy: 'auditor-1',
    });
    expect(compliance.documents[0].expiresAt).toBe('2025-12-31T00:00:00.000Z');
    expect(compliance.documents[1]).toMatchObject({
      type: 'LGPD',
      status: 'pending',
      required: false,
      expiresAt: null,
    });
    expect(cacheService.set).toHaveBeenCalledWith(
      expect.objectContaining({
        clinicId: 'clinic-1',
        tenantId: 'tenant-1',
        section: 'security',
      }),
    );
  });
});
