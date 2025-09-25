import { ListPatientsUseCase } from '@modules/patients/use-cases/list-patients.use-case';
import { IPatientRepository } from '@domain/patients/interfaces/repositories/patient.repository.interface';
import { RolesEnum } from '@domain/auth/enums/roles.enum';
import { unwrapResult } from '@shared/types/result.type';

describe('ListPatientsUseCase', () => {
  let repository: jest.Mocked<IPatientRepository>;
  let useCase: ListPatientsUseCase;

  const listResult = {
    data: [
      {
        id: 'patient-1',
        slug: 'patient-1',
        fullName: 'Paciente 1',
        status: 'active',
        cpfMasked: '***',
        contact: { email: 'p1@example.com', phone: '11', whatsapp: '11' },
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
        updatedAt: new Date('2025-01-02T00:00:00.000Z'),
      } as any,
    ],
    total: 1,
  };

  beforeEach(() => {
    repository = {
      findAll: jest.fn().mockResolvedValue(listResult),
    } as unknown as jest.Mocked<IPatientRepository>;

    useCase = new ListPatientsUseCase(repository);
  });

  it('mantem filtros informados para roles administrativas', async () => {
    const params = {
      tenantId: 'tenant-1',
      requesterId: 'admin-1',
      requesterRole: RolesEnum.SUPER_ADMIN,
      filters: { status: ['active'], quickFilter: 'inactive_30_days' },
      page: 2,
      limit: 50,
      sortBy: 'createdAt',
      sortOrder: 'desc' as const,
    };

    const result = unwrapResult(await useCase.execute(params));

    expect(repository.findAll).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      filters: { status: ['active'], quickFilter: 'inactive_30_days' },
      page: 2,
      limit: 50,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    expect(result).toEqual(listResult);
  });

  it('forca filtro de profissional quando role PROFESSIONAL', async () => {
    const result = unwrapResult(
      await useCase.execute({
        tenantId: 'tenant-1',
        requesterId: 'professional-1',
        requesterRole: RolesEnum.PROFESSIONAL,
        filters: { status: ['active'], assignedProfessionalIds: ['other'] },
      }),
    );

    expect(repository.findAll).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      filters: { status: ['active'], assignedProfessionalIds: ['professional-1'] },
      page: undefined,
      limit: undefined,
      sortBy: undefined,
      sortOrder: undefined,
    });
    expect(result.total).toBe(1);
  });
  it('usa filtros vazios quando nao informados', async () => {
    const result = unwrapResult(
      await useCase.execute({
        tenantId: 'tenant-1',
        requesterId: 'secretary-1',
        requesterRole: RolesEnum.SECRETARY,
      }),
    );

    expect(repository.findAll).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      filters: {},
      page: undefined,
      limit: undefined,
      sortBy: undefined,
      sortOrder: undefined,
    });
    expect(result).toEqual(listResult);
  });
});

