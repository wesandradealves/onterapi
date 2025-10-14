import { TransferClinicProfessionalUseCase } from '../../../src/modules/clinic/use-cases/transfer-clinic-professional.use-case';
import { IClinicRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic.repository.interface';
import { IClinicMemberRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-member.repository.interface';
import { IClinicConfigurationRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-configuration.repository.interface';
import { Clinic } from '../../../src/domain/clinic/types/clinic.types';
import { ClinicAuditService } from '../../../src/infrastructure/clinic/services/clinic-audit.service';
import { MessageBus } from '../../../src/shared/messaging/message-bus';
import { RolesEnum } from '../../../src/domain/auth/enums/roles.enum';
import { DomainEvents } from '../../../src/shared/events/domain-events';

type Mocked<T> = jest.Mocked<T>;

const createClinic = (overrides: Partial<Clinic> = {}): Clinic =>
  ({
    id: 'clinic-1',
    tenantId: 'tenant-1',
    name: 'Clinic 1',
    slug: 'clinic-1',
    status: 'active',
    primaryOwnerId: 'owner-1',
    document: undefined,
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

describe('TransferClinicProfessionalUseCase', () => {
  let clinicRepository: Mocked<IClinicRepository>;
  let memberRepository: Mocked<IClinicMemberRepository>;
  let configurationRepository: Mocked<IClinicConfigurationRepository>;
  let auditService: Mocked<ClinicAuditService>;
  let messageBus: Mocked<MessageBus>;
  let useCase: TransferClinicProfessionalUseCase;

  beforeEach(() => {
    clinicRepository = {
      findById: jest.fn(),
    } as unknown as Mocked<IClinicRepository>;

    memberRepository = {
      findActiveByClinicAndUser: jest.fn(),
      hasQuotaAvailable: jest.fn(),
      transferProfessional: jest.fn(),
    } as unknown as Mocked<IClinicMemberRepository>;

    configurationRepository = {
      findLatestAppliedVersion: jest.fn(),
    } as unknown as Mocked<IClinicConfigurationRepository>;

    auditService = {
      register: jest.fn(),
    } as unknown as Mocked<ClinicAuditService>;

    messageBus = {
      publish: jest.fn(),
      publishMany: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    } as unknown as Mocked<MessageBus>;

    useCase = new TransferClinicProfessionalUseCase(
      clinicRepository,
      memberRepository,
      configurationRepository,
      auditService,
      messageBus,
    );
  });

  it('transfere profissional entre clínicas com sucesso', async () => {
    const fromClinic = createClinic({ id: 'clinic-from' });
    const toClinic = createClinic({ id: 'clinic-to' });

    (clinicRepository.findById as jest.Mock).mockImplementation((clinicId: string) => {
      if (clinicId === 'clinic-from') return Promise.resolve(fromClinic);
      if (clinicId === 'clinic-to') return Promise.resolve(toClinic);
      return Promise.resolve(null);
    });

    const membership = {
      id: 'membership-1',
      clinicId: fromClinic.id,
      tenantId: fromClinic.tenantId,
      userId: 'professional-1',
      role: RolesEnum.PROFESSIONAL,
      status: 'active',
      scope: [],
      preferences: {},
      joinedAt: new Date('2024-01-01T00:00:00Z'),
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
    };

    (memberRepository.findActiveByClinicAndUser as jest.Mock).mockImplementation(({ clinicId }) => {
      if (clinicId === 'clinic-from') return Promise.resolve(membership);
      return Promise.resolve(null);
    });

    configurationRepository.findLatestAppliedVersion.mockResolvedValue({
      payload: { quotas: [{ role: RolesEnum.PROFESSIONAL, limit: 5 }] },
    } as never);

    memberRepository.hasQuotaAvailable.mockResolvedValue(true);

    memberRepository.transferProfessional.mockResolvedValue({
      fromMembership: membership as any,
      toMembership: {
        ...membership,
        id: 'membership-2',
        clinicId: toClinic.id,
        joinedAt: new Date('2025-02-01T00:00:00Z'),
      },
    });

    const input = {
      tenantId: 'tenant-1',
      professionalId: 'professional-1',
      fromClinicId: 'clinic-from',
      toClinicId: 'clinic-to',
      effectiveDate: new Date('2025-02-01T00:00:00Z'),
      transferPatients: true,
      performedBy: 'user-1',
    };

    const result = await useCase.executeOrThrow(input);

    expect(result.fromMembership.id).toBe('membership-1');
    expect(result.toMembership.id).toBe('membership-2');
    expect(result.transferPatients).toBe(true);
    expect(messageBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: DomainEvents.CLINIC_PROFESSIONAL_TRANSFERRED,
        aggregateId: 'professional-1',
      }),
    );
    expect(auditService.register).toHaveBeenCalledTimes(2);
  });

  it('lança erro quando profissional não está na clínica de origem', async () => {
    (clinicRepository.findById as jest.Mock).mockResolvedValue(createClinic());
    (clinicRepository.findById as jest.Mock).mockResolvedValueOnce(createClinic());

    memberRepository.findActiveByClinicAndUser.mockResolvedValue(null);

    await expect(
      useCase.executeOrThrow({
        tenantId: 'tenant-1',
        professionalId: 'professional-1',
        fromClinicId: 'clinic-from',
        toClinicId: 'clinic-to',
        effectiveDate: new Date(),
        transferPatients: false,
        performedBy: 'user-1',
      }),
    ).rejects.toThrow(/Profissional/);
  });

  it('respeita quota da clínica de destino', async () => {
    const fromClinic = createClinic({ id: 'clinic-from' });
    const toClinic = createClinic({ id: 'clinic-to' });

    (clinicRepository.findById as jest.Mock).mockImplementation((clinicId: string) => {
      if (clinicId === 'clinic-from') return Promise.resolve(fromClinic);
      if (clinicId === 'clinic-to') return Promise.resolve(toClinic);
      return Promise.resolve(null);
    });

    memberRepository.findActiveByClinicAndUser.mockResolvedValueOnce({
      id: 'membership-1',
      clinicId: fromClinic.id,
      tenantId: fromClinic.tenantId,
      userId: 'professional-1',
      role: RolesEnum.PROFESSIONAL,
      status: 'active',
      scope: [],
      preferences: {},
      joinedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    memberRepository.findActiveByClinicAndUser.mockResolvedValueOnce(null);

    configurationRepository.findLatestAppliedVersion.mockResolvedValue({
      payload: { quotas: [{ role: RolesEnum.PROFESSIONAL, limit: 1 }] },
    } as never);

    memberRepository.hasQuotaAvailable.mockResolvedValue(false);

    await expect(
      useCase.executeOrThrow({
        tenantId: 'tenant-1',
        professionalId: 'professional-1',
        fromClinicId: 'clinic-from',
        toClinicId: 'clinic-to',
        effectiveDate: new Date(),
        transferPatients: false,
        performedBy: 'user-1',
      }),
    ).rejects.toThrow(/Quota de profissionais/);
  });
});
