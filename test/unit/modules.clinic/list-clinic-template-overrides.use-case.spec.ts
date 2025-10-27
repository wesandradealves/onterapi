import { ListClinicTemplateOverridesUseCase } from '../../../src/modules/clinic/use-cases/list-clinic-template-overrides.use-case';
import { IClinicRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic.repository.interface';
import { IClinicTemplateOverrideRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-template-override.repository.interface';
import {
  Clinic,
  ClinicTemplateOverride,
  ClinicTemplateOverrideListResult,
  ListClinicTemplateOverridesInput,
} from '../../../src/domain/clinic/types/clinic.types';

describe('ListClinicTemplateOverridesUseCase', () => {
  let clinicRepository: jest.Mocked<IClinicRepository>;
  let overrideRepository: jest.Mocked<IClinicTemplateOverrideRepository>;
  let useCase: ListClinicTemplateOverridesUseCase;
  let clinic: Clinic;
  let override: ClinicTemplateOverride;

  beforeEach(() => {
    clinicRepository = {
      findByTenant: jest.fn(),
    } as unknown as jest.Mocked<IClinicRepository>;

    overrideRepository = {
      list: jest.fn(),
    } as unknown as jest.Mocked<IClinicTemplateOverrideRepository>;

    useCase = new ListClinicTemplateOverridesUseCase(clinicRepository, overrideRepository);

    clinic = {
      id: 'clinic-1',
      tenantId: 'tenant-1',
      name: 'Clinica',
      slug: 'clinica',
      status: 'active',
      primaryOwnerId: 'owner-1',
      configurationVersions: {},
      holdSettings: undefined,
      metadata: {},
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    } as Clinic;

    override = {
      id: 'override-1',
      clinicId: clinic.id,
      tenantId: clinic.tenantId,
      templateClinicId: 'template-1',
      section: 'services',
      overrideVersion: 2,
      overridePayload: { allowOnline: false },
      overrideHash: 'hash-1',
      baseTemplateVersionId: 'template-version-4',
      baseTemplateVersionNumber: 4,
      appliedConfigurationVersionId: 'config-version-2',
      createdBy: 'user-1',
      createdAt: new Date('2025-02-01T10:00:00.000Z'),
      supersededAt: undefined,
      supersededBy: undefined,
      updatedAt: new Date('2025-02-02T12:00:00.000Z'),
    };
  });

  it('lista overrides com paginacao sanitizada', async () => {
    clinicRepository.findByTenant.mockResolvedValue(clinic);

    const repositoryResult: ClinicTemplateOverrideListResult = {
      data: [override],
      total: 7,
      page: 3,
      limit: 10,
    };

    overrideRepository.list.mockResolvedValue(repositoryResult);

    const input: ListClinicTemplateOverridesInput = {
      tenantId: clinic.tenantId,
      clinicId: clinic.id,
      section: 'services',
      includeSuperseded: true,
      page: 3,
      limit: 50,
    };

    const result = await useCase.executeOrThrow(input);

    expect(overrideRepository.list).toHaveBeenCalledWith({
      tenantId: clinic.tenantId,
      clinicId: clinic.id,
      section: 'services',
      includeSuperseded: true,
      page: 3,
      limit: 50,
    });

    expect(result).toEqual(repositoryResult);
  });

  it('usa valores padrao quando paginacao nao fornecida', async () => {
    clinicRepository.findByTenant.mockResolvedValue(clinic);

    const repositoryResult: ClinicTemplateOverrideListResult = {
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    };

    overrideRepository.list.mockResolvedValue(repositoryResult);

    await useCase.executeOrThrow({
      tenantId: clinic.tenantId,
      clinicId: clinic.id,
    });

    expect(overrideRepository.list).toHaveBeenCalledWith({
      tenantId: clinic.tenantId,
      clinicId: clinic.id,
      section: undefined,
      includeSuperseded: undefined,
      page: 1,
      limit: 20,
    });
  });

  it('lança erro quando clinica nao existe', async () => {
    clinicRepository.findByTenant.mockResolvedValue(null);

    await expect(
      useCase.executeOrThrow({
        tenantId: clinic.tenantId,
        clinicId: clinic.id,
      }),
    ).rejects.toThrow('Clinica nao encontrada');

    expect(overrideRepository.list).not.toHaveBeenCalled();
  });
});
