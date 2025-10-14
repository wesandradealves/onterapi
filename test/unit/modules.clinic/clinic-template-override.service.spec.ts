import { ClinicTemplateOverrideService } from '../../../src/modules/clinic/services/clinic-template-override.service';
import { IClinicTemplateOverrideRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-template-override.repository.interface';
import { IClinicConfigurationRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-configuration.repository.interface';
import { IClinicRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic.repository.interface';
import { ClinicAuditService } from '../../../src/infrastructure/clinic/services/clinic-audit.service';
import {
  Clinic,
  ClinicConfigurationVersion,
  ClinicTemplateOverride,
} from '../../../src/domain/clinic/types/clinic.types';
import { hashOverridePayload } from '../../../src/modules/clinic/utils/template-override.util';

type Mocked<T> = jest.Mocked<T>;

const createClinic = (overrides: Partial<Clinic> = {}): Clinic =>
  ({
    id: 'clinic-1',
    tenantId: 'tenant-1',
    name: 'Clinic 1',
    slug: 'clinic-1',
    status: 'active',
    primaryOwnerId: 'owner-1',
    configurationVersions: {},
    holdSettings: {
      ttlMinutes: 30,
      minAdvanceMinutes: 60,
      maxAdvanceMinutes: undefined,
      allowOverbooking: false,
      overbookingThreshold: undefined,
      resourceMatchingStrict: true,
    },
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    metadata: {},
    ...overrides,
  }) as Clinic;

const createTemplateVersion = (
  overrides: Partial<ClinicConfigurationVersion> = {},
): ClinicConfigurationVersion => ({
  id: 'version-1',
  clinicId: 'template-clinic',
  tenantId: 'tenant-1',
  section: 'general',
  version: 1,
  payload: { allowOnline: true },
  createdBy: 'user-template',
  createdAt: new Date('2025-01-02T00:00:00Z'),
  appliedAt: new Date('2025-01-03T00:00:00Z'),
  notes: null,
  autoApply: true,
  ...overrides,
});

const createOverride = (
  overrides: Partial<ClinicTemplateOverride> = {},
): ClinicTemplateOverride => ({
  id: 'override-1',
  clinicId: 'clinic-1',
  tenantId: 'tenant-1',
  templateClinicId: 'template-clinic',
  section: 'general',
  overrideVersion: 1,
  overridePayload: { allowOnline: false },
  overrideHash: 'hash-1',
  baseTemplateVersionId: 'version-1',
  baseTemplateVersionNumber: 1,
  createdBy: 'user-1',
  createdAt: new Date('2025-01-04T00:00:00Z'),
  supersededAt: undefined,
  supersededBy: undefined,
  appliedConfigurationVersionId: undefined,
  ...overrides,
});

describe('ClinicTemplateOverrideService', () => {
  let overrideRepository: Mocked<IClinicTemplateOverrideRepository>;
  let configurationRepository: Mocked<IClinicConfigurationRepository>;
  let clinicRepository: Mocked<IClinicRepository>;
  let auditService: Mocked<ClinicAuditService>;
  let service: ClinicTemplateOverrideService;

  beforeEach(() => {
    overrideRepository = {
      findActive: jest.fn(),
      findLatest: jest.fn(),
      create: jest.fn(),
      supersede: jest.fn(),
      supersedeBySection: jest.fn(),
      updateAppliedVersion: jest.fn(),
      updateBaseTemplateVersion: jest.fn(),
    } as unknown as Mocked<IClinicTemplateOverrideRepository>;

    configurationRepository = {
      findLatestAppliedVersion: jest.fn(),
      findVersionById: jest.fn(),
      listVersions: jest.fn(),
      createVersion: jest.fn(),
      applyVersion: jest.fn(),
      deleteVersion: jest.fn(),
    } as unknown as Mocked<IClinicConfigurationRepository>;

    clinicRepository = {
      updateTemplateOverrideMetadata: jest.fn(),
    } as unknown as Mocked<IClinicRepository>;

    auditService = {
      register: jest.fn(),
    } as unknown as Mocked<ClinicAuditService>;

    service = new ClinicTemplateOverrideService(
      overrideRepository,
      configurationRepository,
      clinicRepository,
      auditService,
    );
  });

  describe('mergeWithActiveOverride', () => {
    it('atualiza base quando override usa versÃ£o desatualizada', async () => {
      const clinic = createClinic();
      const templateVersion = createTemplateVersion({
        payload: { timezone: 'UTC', allowOnline: true },
      });
      const activeOverride = createOverride({
        baseTemplateVersionId: 'outdated-version',
        overridePayload: { timezone: 'America/Sao_Paulo' },
      });

      overrideRepository.findActive.mockResolvedValue(activeOverride);
      overrideRepository.updateBaseTemplateVersion.mockResolvedValue({
        ...activeOverride,
        baseTemplateVersionId: templateVersion.id,
        baseTemplateVersionNumber: templateVersion.version,
      });

      const result = await service.mergeWithActiveOverride({
        clinic,
        section: 'general',
        templateVersion,
      });

      expect(overrideRepository.updateBaseTemplateVersion).toHaveBeenCalledWith({
        overrideId: activeOverride.id,
        baseTemplateVersionId: templateVersion.id,
        baseTemplateVersionNumber: templateVersion.version,
      });
      expect(result.payload).toEqual({
        timezone: 'America/Sao_Paulo',
        allowOnline: true,
      });
      expect(result.override).toEqual(activeOverride);
    });
  });

  describe('markOverrideApplied', () => {
    it('sincroniza metadados e auditoria', async () => {
      const clinic = createClinic();
      const override = createOverride({ overrideVersion: 2, overrideHash: 'hash-2' });

      overrideRepository.updateAppliedVersion.mockResolvedValue({
        ...override,
        appliedConfigurationVersionId: 'config-version',
        createdAt: override.createdAt,
      });

      await service.markOverrideApplied({
        clinic,
        section: 'general',
        override,
        appliedVersionId: 'config-version',
        updatedBy: 'user-1',
      });

      expect(overrideRepository.updateAppliedVersion).toHaveBeenCalledWith({
        overrideId: override.id,
        appliedConfigurationVersionId: 'config-version',
        appliedAt: expect.any(Date),
      });
      expect(clinicRepository.updateTemplateOverrideMetadata).toHaveBeenCalledWith({
        clinicId: clinic.id,
        tenantId: clinic.tenantId,
        section: 'general',
        override: expect.objectContaining({
          overrideId: override.id,
          overrideVersion: override.overrideVersion,
          overrideHash: override.overrideHash,
          appliedConfigurationVersionId: 'config-version',
        }),
      });
      expect(auditService.register).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'clinic.configuration.override_applied',
          detail: expect.objectContaining({
            section: 'general',
            overrideId: override.id,
            overrideVersion: override.overrideVersion,
            appliedConfigurationVersionId: 'config-version',
          }),
        }),
      );
    });
  });

  describe('upsertManualOverride', () => {
    it('limpa overrides quando nÃ£o hÃ¡ metadados de template', async () => {
      const clinic = createClinic();

      await service.upsertManualOverride({
        clinic,
        section: 'general',
        payload: { allowOnline: false },
        appliedVersionId: 'config-version',
        updatedBy: 'user-1',
      });

      expect(overrideRepository.supersedeBySection).toHaveBeenCalledWith({
        clinicId: clinic.id,
        tenantId: clinic.tenantId,
        section: 'general',
        supersededBy: 'user-1',
      });
      expect(clinicRepository.updateTemplateOverrideMetadata).toHaveBeenCalledWith({
        clinicId: clinic.id,
        tenantId: clinic.tenantId,
        section: 'general',
        override: null,
      });
      expect(overrideRepository.create).not.toHaveBeenCalled();
    });

    it('remove override ativo quando diff estÃ¡ vazio', async () => {
      const clinic = createClinic({
        metadata: {
          templatePropagation: {
            templateClinicId: 'template-clinic',
            sections: {
              general: {
                templateVersionId: 'version-1',
                templateVersionNumber: 1,
              },
            },
          },
        },
      });

      const templateVersion = createTemplateVersion({ payload: { allowOnline: true } });
      const activeOverride = createOverride({ overridePayload: { allowOnline: true } });

      configurationRepository.findVersionById.mockResolvedValue(templateVersion);
      overrideRepository.findActive.mockResolvedValue(activeOverride);

      await service.upsertManualOverride({
        clinic,
        section: 'general',
        payload: { allowOnline: true },
        appliedVersionId: 'config-version',
        updatedBy: 'user-1',
      });

      expect(overrideRepository.supersede).toHaveBeenCalledWith({
        overrideId: activeOverride.id,
        supersededBy: 'user-1',
      });
      expect(clinicRepository.updateTemplateOverrideMetadata).toHaveBeenCalledWith({
        clinicId: clinic.id,
        tenantId: clinic.tenantId,
        section: 'general',
        override: null,
      });
      expect(auditService.register).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'clinic.configuration.override_cleared',
          detail: expect.objectContaining({
            overrideId: activeOverride.id,
            section: 'general',
          }),
        }),
      );
    });

    it('cria novo override e aplica imediatamente quando diff existe', async () => {
      const clinic = createClinic({
        metadata: {
          templatePropagation: {
            templateClinicId: 'template-clinic',
            sections: {
              general: {
                templateVersionId: 'version-1',
                templateVersionNumber: 1,
              },
            },
          },
        },
      });

      const templateVersion = createTemplateVersion({ payload: { allowOnline: true } });
      configurationRepository.findVersionById.mockResolvedValue(templateVersion);
      overrideRepository.findActive.mockResolvedValue(null);

      const diffPayload = { allowOnline: false };
      const expectedHash = hashOverridePayload(diffPayload);
      const createdOverride = createOverride({
        overridePayload: diffPayload,
        overrideHash: expectedHash,
        overrideVersion: 2,
      });

      overrideRepository.create.mockResolvedValue(createdOverride);
      overrideRepository.updateAppliedVersion.mockResolvedValue({
        ...createdOverride,
        appliedConfigurationVersionId: 'config-version',
      });

      await service.upsertManualOverride({
        clinic,
        section: 'general',
        payload: diffPayload,
        appliedVersionId: 'config-version',
        updatedBy: 'user-1',
      });

      expect(overrideRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          clinicId: clinic.id,
          tenantId: clinic.tenantId,
          section: 'general',
          overridePayload: diffPayload,
          overrideHash: expectedHash,
          createdBy: 'user-1',
        }),
      );
      expect(auditService.register).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'clinic.configuration.override_saved',
          detail: expect.objectContaining({
            overrideId: createdOverride.id,
            section: 'general',
          }),
        }),
      );
      expect(overrideRepository.updateAppliedVersion).toHaveBeenCalledWith({
        overrideId: createdOverride.id,
        appliedConfigurationVersionId: 'config-version',
        appliedAt: expect.any(Date),
      });
      expect(clinicRepository.updateTemplateOverrideMetadata).toHaveBeenCalledWith({
        clinicId: clinic.id,
        tenantId: clinic.tenantId,
        section: 'general',
        override: expect.objectContaining({
          overrideId: createdOverride.id,
          overrideVersion: createdOverride.overrideVersion,
          overrideHash: createdOverride.overrideHash,
          appliedConfigurationVersionId: 'config-version',
        }),
      });
    });
  });
});
