import { UpdateClinicSecuritySettingsUseCase } from '../../../src/modules/clinic/use-cases/update-clinic-security-settings.use-case';
import { IClinicRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic.repository.interface';
import { IClinicConfigurationRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-configuration.repository.interface';
import { Clinic, ClinicConfigurationVersion } from '../../../src/domain/clinic/types/clinic.types';
import { ClinicConfigurationValidator } from '../../../src/modules/clinic/services/clinic-configuration-validator.service';
import { ClinicTemplateOverrideService } from '../../../src/modules/clinic/services/clinic-template-override.service';
import { ClinicConfigurationTelemetryService } from '../../../src/modules/clinic/services/clinic-configuration-telemetry.service';
import { ClinicConfigurationCacheService } from '../../../src/modules/clinic/services/clinic-configuration-cache.service';
import { ClinicAuditService } from '../../../src/infrastructure/clinic/services/clinic-audit.service';

type Mocked<T> = jest.Mocked<T>;

describe('UpdateClinicSecuritySettingsUseCase', () => {
  let clinicRepository: Mocked<IClinicRepository>;
  let configurationRepository: Mocked<IClinicConfigurationRepository>;
  let validator: Mocked<ClinicConfigurationValidator>;
  let templateOverrideService: Mocked<ClinicTemplateOverrideService>;
  let telemetryService: Mocked<ClinicConfigurationTelemetryService>;
  let cacheService: Mocked<ClinicConfigurationCacheService>;
  let auditService: Mocked<ClinicAuditService>;
  let useCase: UpdateClinicSecuritySettingsUseCase;

  beforeEach(() => {
    clinicRepository = {
      findByTenant: jest.fn(),
      setCurrentConfigurationVersion: jest.fn(),
      updateComplianceDocuments: jest.fn(),
    } as unknown as Mocked<IClinicRepository>;

    configurationRepository = {
      createVersion: jest.fn(),
      applyVersion: jest.fn(),
    } as unknown as Mocked<IClinicConfigurationRepository>;

    validator = {
      validateSecuritySettings: jest.fn(),
    } as unknown as Mocked<ClinicConfigurationValidator>;

    templateOverrideService = {
      upsertManualOverride: jest.fn(),
    } as unknown as Mocked<ClinicTemplateOverrideService>;

    telemetryService = {
      markSaving: jest.fn(),
      markSaved: jest.fn(),
      markError: jest.fn(),
    } as unknown as Mocked<ClinicConfigurationTelemetryService>;

    cacheService = {
      set: jest.fn(),
    } as unknown as Mocked<ClinicConfigurationCacheService>;

    auditService = {
      register: jest.fn(),
    } as unknown as Mocked<ClinicAuditService>;

    useCase = new UpdateClinicSecuritySettingsUseCase(
      clinicRepository,
      configurationRepository,
      auditService,
      validator,
      templateOverrideService,
      telemetryService,
      cacheService,
    );
  });

  it('aplica configuracao, atualiza compliance e registra auditoria', async () => {
    const clinic = { id: 'clinic-1', tenantId: 'tenant-1' } as Clinic;
    clinicRepository.findByTenant.mockResolvedValue(clinic);

    const version: ClinicConfigurationVersion = {
      id: 'version-1',
      clinicId: 'clinic-1',
      section: 'security',
      version: 2,
      createdBy: 'user-1',
      createdAt: new Date('2025-01-01T10:00:00Z'),
      autoApply: true,
      payload: {},
    };
    configurationRepository.createVersion.mockResolvedValue(version);
    configurationRepository.applyVersion.mockResolvedValue(undefined);
    telemetryService.markSaved.mockResolvedValue({
      section: 'security',
      state: 'saved',
      completionScore: 1,
    });

    const input = {
      clinicId: 'clinic-1',
      tenantId: 'tenant-1',
      requestedBy: 'user-1',
      securitySettings: {
        twoFactor: { enabled: true, requiredRoles: [], backupCodesEnabled: false },
        passwordPolicy: {
          minLength: 10,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialCharacters: true,
        },
        session: { idleTimeoutMinutes: 15, absoluteTimeoutMinutes: 120 },
        loginAlerts: { email: true, whatsapp: false },
        ipRestrictions: { enabled: true, allowlist: [], blocklist: [] },
        audit: { retentionDays: 365, exportEnabled: true },
        compliance: {
          documents: [
            {
              id: 'doc-1',
              type: 'CRM',
              status: 'valid',
              required: true,
              expiresAt: new Date('2025-12-31T00:00:00Z'),
              metadata: { issuer: 'CRM-SP' },
            },
            {
              type: 'LGPD',
              status: 'pending',
              required: false,
              expiresAt: null,
            },
          ],
        },
        metadata: {},
      },
    } as Parameters<UpdateClinicSecuritySettingsUseCase['executeOrThrow']>[0];

    await useCase.executeOrThrow(input);

    expect(validator.validateSecuritySettings).toHaveBeenCalledWith(input.securitySettings);
    expect(configurationRepository.createVersion).toHaveBeenCalledWith(
      expect.objectContaining({ section: 'security' }),
    );
    expect(clinicRepository.updateComplianceDocuments).toHaveBeenCalledWith(
      expect.objectContaining({
        clinicId: 'clinic-1',
        tenantId: 'tenant-1',
        updatedBy: 'user-1',
      }),
    );

    const complianceCall = clinicRepository.updateComplianceDocuments.mock.calls[0][0];
    expect(complianceCall.documents).toHaveLength(2);
    expect(complianceCall.documents[0].type).toBe('CRM');
    expect(complianceCall.documents[0].expiresAt).toBeInstanceOf(Date);
    expect(complianceCall.documents[1].expiresAt).toBeNull();

    expect(auditService.register).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'clinic.security_settings.updated',
        clinicId: 'clinic-1',
        tenantId: 'tenant-1',
        performedBy: 'user-1',
      }),
    );
    expect(cacheService.set).toHaveBeenCalledWith(
      expect.objectContaining({ clinicId: 'clinic-1', section: 'security' }),
    );
  });

  it('lança erro quando clinica nao existe', async () => {
    clinicRepository.findByTenant.mockResolvedValue(null);

    await expect(
      useCase.executeOrThrow({
        clinicId: 'clinic-missing',
        tenantId: 'tenant-1',
        requestedBy: 'user-1',
        securitySettings: {
          twoFactor: { enabled: false, requiredRoles: [], backupCodesEnabled: false },
          passwordPolicy: {
            minLength: 8,
            requireUppercase: false,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialCharacters: false,
          },
          session: { idleTimeoutMinutes: 10, absoluteTimeoutMinutes: 60 },
          loginAlerts: { email: true, whatsapp: false },
          ipRestrictions: { enabled: false, allowlist: [], blocklist: [] },
          audit: { retentionDays: 120, exportEnabled: false },
          metadata: {},
        },
      }),
    ).rejects.toThrow('Clinica nao encontrada');

    expect(configurationRepository.createVersion).not.toHaveBeenCalled();
    expect(clinicRepository.updateComplianceDocuments).not.toHaveBeenCalled();
    expect(auditService.register).not.toHaveBeenCalled();
  });
});
