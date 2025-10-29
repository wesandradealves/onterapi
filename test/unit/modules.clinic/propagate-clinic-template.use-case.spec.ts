import { PropagateClinicTemplateUseCase } from '../../../src/modules/clinic/use-cases/propagate-clinic-template.use-case';
import { IClinicRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic.repository.interface';
import { IClinicConfigurationRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-configuration.repository.interface';
import { ClinicAuditService } from '../../../src/infrastructure/clinic/services/clinic-audit.service';
import { MessageBus } from '../../../src/shared/messaging/message-bus';
import { ClinicTemplateOverrideService } from '../../../src/modules/clinic/services/clinic-template-override.service';
import { DomainEvents } from '../../../src/shared/events/domain-events';
import { ClinicConfigurationCacheService } from '../../../src/modules/clinic/services/clinic-configuration-cache.service';
import {
  Clinic,
  ClinicConfigurationVersion,
  ClinicTemplateOverride,
  ClinicTemplatePropagationInput,
} from '../../../src/domain/clinic/types/clinic.types';

type Mocked<T> = jest.Mocked<T>;

const createClinic = (overrides: Partial<Clinic> = {}): Clinic =>
  ({
    id: 'clinic-id',
    tenantId: 'tenant-1',
    name: 'Clinic',
    slug: 'clinic',
    status: 'active',
    document: undefined,
    configurationVersions: {},
    holdSettings: undefined,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as unknown as Clinic;

const createVersion = (
  overrides: Partial<ClinicConfigurationVersion> = {},
): ClinicConfigurationVersion => ({
  id: 'version-id',
  clinicId: 'template-clinic',
  tenantId: 'tenant-1',
  section: 'general',
  version: 5,
  payload: { foo: 'bar' },
  createdBy: 'user-template',
  createdAt: new Date('2025-01-01T00:00:00Z'),
  appliedAt: new Date('2025-01-02T00:00:00Z'),
  notes: null,
  autoApply: true,
  ...overrides,
});

describe('PropagateClinicTemplateUseCase', () => {
  let clinicRepository: Mocked<IClinicRepository>;
  let configurationRepository: Mocked<IClinicConfigurationRepository>;
  let auditService: ClinicAuditService;
  let useCase: PropagateClinicTemplateUseCase;
  let messageBus: Mocked<MessageBus>;
  let templateOverrideService: Mocked<ClinicTemplateOverrideService>;
  let configurationCache: Mocked<ClinicConfigurationCacheService>;

  beforeEach(() => {
    clinicRepository = {
      findById: jest.fn(),
      setCurrentConfigurationVersion: jest.fn(),
      updateTemplatePropagationMetadata: jest.fn(),
      updateTemplateOverrideMetadata: jest.fn(),
      listComplianceDocuments: jest.fn(),
    } as unknown as Mocked<IClinicRepository>;

    configurationRepository = {
      findLatestAppliedVersion: jest.fn(),
      createVersion: jest.fn(),
      applyVersion: jest.fn(),
    } as unknown as Mocked<IClinicConfigurationRepository>;

    auditService = {
      register: jest.fn(),
    } as unknown as ClinicAuditService;

    messageBus = {
      publish: jest.fn(),
      publishMany: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    } as unknown as Mocked<MessageBus>;

    templateOverrideService = {
      mergeWithActiveOverride: jest.fn(),
      markOverrideApplied: jest.fn(),
    } as unknown as Mocked<ClinicTemplateOverrideService>;

    configurationCache = {
      set: jest.fn(),
    } as unknown as Mocked<ClinicConfigurationCacheService>;

    (templateOverrideService.mergeWithActiveOverride as jest.Mock).mockImplementation(
      async ({ templateVersion }) => ({
        payload: templateVersion.payload ?? {},
        override: null,
      }),
    );

    useCase = new PropagateClinicTemplateUseCase(
      clinicRepository,
      configurationRepository,
      auditService,
      messageBus,
      templateOverrideService,
      configurationCache,
    );
  });

  it('propaga versoes para multiplas clinicas e secoes', async () => {
    const templateClinic = createClinic({ id: 'template', tenantId: 'tenant-1' });
    const targetClinicA = createClinic({ id: 'clinic-a' });
    const targetClinicB = createClinic({ id: 'clinic-b' });

    (clinicRepository.findById as jest.Mock).mockImplementation((clinicId: string) => {
      if (clinicId === 'template') return Promise.resolve(templateClinic);
      if (clinicId === 'clinic-a') return Promise.resolve(targetClinicA);
      if (clinicId === 'clinic-b') return Promise.resolve(targetClinicB);
      return Promise.resolve(null);
    });

    const templateVersionGeneral = createVersion({
      id: 'version-general',
      section: 'general',
      payload: { general: true },
    });
    const templateVersionServices = createVersion({
      id: 'version-services',
      section: 'services',
      payload: { services: true },
    });

    (configurationRepository.findLatestAppliedVersion as jest.Mock).mockImplementation(
      async (_clinicId: string, section: string) => {
        if (section === 'general') return templateVersionGeneral;
        if (section === 'services') return templateVersionServices;
        return null;
      },
    );

    let versionCounter = 1;
    (configurationRepository.createVersion as jest.Mock).mockImplementation(async (data) =>
      createVersion({
        id: `new-version-${versionCounter++}`,
        clinicId: data.clinicId,
        tenantId: data.tenantId,
        section: data.section,
        payload: data.payload,
        createdBy: data.createdBy,
        notes: data.versionNotes ?? null,
        appliedAt: null,
        autoApply: data.autoApply ?? false,
      }),
    );

    const input: ClinicTemplatePropagationInput = {
      tenantId: 'tenant-1',
      templateClinicId: 'template',
      targetClinicIds: ['clinic-a', 'clinic-b'],
      sections: ['general', 'services'],
      versionNotes: 'propagated',
      triggeredBy: 'user-1',
    };

    const result = await useCase.executeOrThrow(input);

    expect(result).toHaveLength(4);
    expect(configurationRepository.createVersion).toHaveBeenCalledTimes(4);
    expect(configurationRepository.applyVersion).toHaveBeenCalledTimes(4);
    expect(clinicRepository.setCurrentConfigurationVersion).toHaveBeenCalledTimes(4);
    expect(clinicRepository.updateTemplatePropagationMetadata).toHaveBeenCalledTimes(4);
    expect(auditService.register).toHaveBeenCalledTimes(4);
    expect(templateOverrideService.mergeWithActiveOverride).toHaveBeenCalledTimes(4);
    expect(templateOverrideService.markOverrideApplied).not.toHaveBeenCalled();
    expect(configurationCache.set).toHaveBeenCalledTimes(4);

    const cacheCalls = configurationCache.set.mock.calls.map((call) => call[0]);

    expect(cacheCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tenantId: 'tenant-1',
          clinicId: 'clinic-a',
          section: 'general',
          version: expect.objectContaining({ id: 'new-version-1' }),
        }),
        expect.objectContaining({
          tenantId: 'tenant-1',
          clinicId: 'clinic-b',
          section: 'general',
          version: expect.objectContaining({ id: 'new-version-2' }),
        }),
        expect.objectContaining({
          tenantId: 'tenant-1',
          clinicId: 'clinic-a',
          section: 'services',
          version: expect.objectContaining({ id: 'new-version-3' }),
        }),
        expect.objectContaining({
          tenantId: 'tenant-1',
          clinicId: 'clinic-b',
          section: 'services',
          version: expect.objectContaining({ id: 'new-version-4' }),
        }),
      ]),
    );
    expect(clinicRepository.updateTemplateOverrideMetadata).toHaveBeenCalledTimes(4);
    expect(messageBus.publish).toHaveBeenCalledTimes(4);

    const firstCall = (configurationRepository.createVersion as jest.Mock).mock.calls[0][0];
    expect(firstCall.section).toBe('general');
    expect(firstCall.autoApply).toBe(true);
    expect(firstCall.versionNotes).toBe('propagated');
    expect(firstCall.payload).toEqual(templateVersionGeneral.payload);

    expect(result.every((version) => version.appliedAt)).toBe(true);

    const publishedEvents = (messageBus.publish as jest.Mock).mock.calls.map(([event]) => event);
    expect(publishedEvents[0]).toMatchObject({
      eventName: DomainEvents.CLINIC_TEMPLATE_PROPAGATED,
      payload: expect.objectContaining({
        templateClinicId: templateClinic.id,
        tenantId: templateClinic.tenantId,
        targetClinicId: targetClinicA.id,
        section: 'general',
      }),
    });
  });

  it('marca overrides aplicados quando presentes', async () => {
    const templateClinic = createClinic({ id: 'template', tenantId: 'tenant-1' });
    const targetClinic = createClinic({ id: 'clinic-a' });

    (clinicRepository.findById as jest.Mock).mockImplementation((clinicId: string) => {
      if (clinicId === 'template') return Promise.resolve(templateClinic);
      if (clinicId === 'clinic-a') return Promise.resolve(targetClinic);
      return Promise.resolve(null);
    });

    const templateVersion = createVersion({
      id: 'version-general',
      section: 'general',
      payload: { general: true },
    });

    configurationRepository.findLatestAppliedVersion.mockResolvedValue(templateVersion);

    configurationRepository.createVersion.mockImplementation(async (data) =>
      createVersion({
        id: 'propagated-version',
        clinicId: data.clinicId,
        tenantId: data.tenantId,
        section: data.section,
        payload: data.payload,
        createdBy: data.createdBy,
        notes: data.versionNotes ?? null,
        appliedAt: null,
        autoApply: data.autoApply ?? false,
      }),
    );

    const override: ClinicTemplateOverride = {
      id: 'override-1',
      clinicId: targetClinic.id,
      tenantId: targetClinic.tenantId,
      templateClinicId: templateClinic.id,
      section: 'general',
      overrideVersion: 2,
      overridePayload: { general: false },
      overrideHash: 'hash-1',
      baseTemplateVersionId: templateVersion.id,
      baseTemplateVersionNumber: templateVersion.version,
      createdBy: 'user-override',
      createdAt: new Date('2025-01-10T00:00:00Z'),
    };

    (templateOverrideService.mergeWithActiveOverride as jest.Mock).mockResolvedValue({
      payload: { general: false },
      override,
    });

    const input: ClinicTemplatePropagationInput = {
      tenantId: 'tenant-1',
      templateClinicId: 'template',
      targetClinicIds: ['clinic-a'],
      sections: ['general'],
      triggeredBy: 'user-1',
    };

    await useCase.executeOrThrow(input);

    expect(templateOverrideService.markOverrideApplied).toHaveBeenCalledWith({
      clinic: targetClinic,
      section: 'general',
      override,
      appliedVersionId: 'propagated-version',
      appliedAt: expect.any(Date),
      updatedBy: 'user-1',
    });
    expect(clinicRepository.updateTemplateOverrideMetadata).not.toHaveBeenCalled();
  });

  it('lanca erro quando clinica template nao existe', async () => {
    (clinicRepository.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.executeOrThrow({
        tenantId: 'tenant-1',
        templateClinicId: 'template',
        targetClinicIds: ['clinic-a'],
        sections: ['general'],
        triggeredBy: 'user-1',
      }),
    ).rejects.toThrow('Clinica template nao encontrada');

    expect(messageBus.publish).not.toHaveBeenCalled();
    expect(clinicRepository.updateTemplatePropagationMetadata).not.toHaveBeenCalled();
    expect(clinicRepository.updateTemplateOverrideMetadata).not.toHaveBeenCalled();
  });

  it('lanca erro quando clinicas alvo sao invalidas', async () => {
    const templateClinic = createClinic({ id: 'template', tenantId: 'tenant-1' });
    (clinicRepository.findById as jest.Mock).mockResolvedValue(templateClinic);

    await expect(
      useCase.executeOrThrow({
        tenantId: 'tenant-1',
        templateClinicId: 'template',
        targetClinicIds: ['template'],
        sections: ['general'],
        triggeredBy: 'user-1',
      }),
    ).rejects.toThrow('Informe pelo menos uma clinica alvo valida');

    expect(messageBus.publish).not.toHaveBeenCalled();
    expect(clinicRepository.updateTemplatePropagationMetadata).not.toHaveBeenCalled();
    expect(clinicRepository.updateTemplateOverrideMetadata).not.toHaveBeenCalled();
  });

  it('lanca erro quando secao nao possui versao aplicada', async () => {
    const templateClinic = createClinic({ id: 'template', tenantId: 'tenant-1' });
    const targetClinic = createClinic({ id: 'clinic-a' });

    (clinicRepository.findById as jest.Mock).mockImplementation((clinicId: string) => {
      if (clinicId === 'template') return Promise.resolve(templateClinic);
      if (clinicId === 'clinic-a') return Promise.resolve(targetClinic);
      return Promise.resolve(null);
    });

    (configurationRepository.findLatestAppliedVersion as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.executeOrThrow({
        tenantId: 'tenant-1',
        templateClinicId: 'template',
        targetClinicIds: ['clinic-a'],
        sections: ['general'],
        triggeredBy: 'user-1',
      }),
    ).rejects.toThrow('A clinica template nao possui versao aplicada para a secao "general"');

    expect(messageBus.publish).not.toHaveBeenCalled();
    expect(clinicRepository.updateTemplatePropagationMetadata).not.toHaveBeenCalled();
    expect(clinicRepository.updateTemplateOverrideMetadata).not.toHaveBeenCalled();
  });

  it('lanca erro quando clinica alvo pertence a outro tenant', async () => {
    const templateClinic = createClinic({ id: 'template', tenantId: 'tenant-1' });
    const foreignClinic = createClinic({ id: 'clinic-foreign', tenantId: 'tenant-2' });

    (clinicRepository.findById as jest.Mock).mockImplementation((clinicId: string) => {
      if (clinicId === 'template') return Promise.resolve(templateClinic);
      if (clinicId === 'clinic-foreign') return Promise.resolve(foreignClinic);
      return Promise.resolve(null);
    });

    (configurationRepository.findLatestAppliedVersion as jest.Mock).mockResolvedValue(
      createVersion(),
    );

    await expect(
      useCase.executeOrThrow({
        tenantId: 'tenant-1',
        templateClinicId: 'template',
        targetClinicIds: ['clinic-foreign'],
        sections: ['general'],
        triggeredBy: 'user-1',
      }),
    ).rejects.toThrow('Clinica alvo clinic-foreign pertence a outro tenant');

    expect(messageBus.publish).not.toHaveBeenCalled();
    expect(clinicRepository.updateTemplatePropagationMetadata).not.toHaveBeenCalled();
    expect(clinicRepository.updateTemplateOverrideMetadata).not.toHaveBeenCalled();
  });
});
