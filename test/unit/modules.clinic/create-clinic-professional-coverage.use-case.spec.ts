import { BadRequestException, NotFoundException } from '@nestjs/common';

import { CreateClinicProfessionalCoverageUseCase } from '../../../src/modules/clinic/use-cases/create-clinic-professional-coverage.use-case';
import { IClinicRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic.repository.interface';
import { IClinicMemberRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-member.repository.interface';
import { IClinicProfessionalCoverageRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-professional-coverage.repository.interface';
import {
  Clinic,
  ClinicMember,
  ClinicProfessionalCoverage,
} from '../../../src/domain/clinic/types/clinic.types';
import { ClinicAuditService } from '../../../src/infrastructure/clinic/services/clinic-audit.service';
import { RolesEnum } from '../../../src/domain/auth/enums/roles.enum';
import { ClinicCoverageSchedulingService } from '../../../src/modules/clinic/services/clinic-coverage-scheduling.service';

type Mocked<T> = jest.Mocked<T>;

describe('CreateClinicProfessionalCoverageUseCase', () => {
  let clinicRepository: Mocked<IClinicRepository>;
  let clinicMemberRepository: Mocked<IClinicMemberRepository>;
  let coverageRepository: Mocked<IClinicProfessionalCoverageRepository>;
  let auditService: Mocked<ClinicAuditService>;
  let coverageSchedulingService: Mocked<ClinicCoverageSchedulingService>;
  let useCase: CreateClinicProfessionalCoverageUseCase;

  const clinic: Clinic = {
    id: 'clinic-1',
    tenantId: 'tenant-1',
    name: 'Clinic',
    slug: 'clinic',
    status: 'active',
    primaryOwnerId: 'owner-1',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    metadata: {},
    holdSettings: {
      ttlMinutes: 30,
      minAdvanceMinutes: 30,
      allowOverbooking: false,
      resourceMatchingStrict: true,
    },
    configurationVersions: {},
  };

  const buildMembership = (overrides?: Partial<ClinicMember>): ClinicMember => ({
    id: 'membership-1',
    clinicId: 'clinic-1',
    tenantId: 'tenant-1',
    userId: 'professional-1',
    role: RolesEnum.PROFESSIONAL,
    status: 'active',
    scope: [],
    preferences: {},
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  });

  beforeEach(() => {
    clinicRepository = {
      findByTenant: jest.fn(),
    } as unknown as Mocked<IClinicRepository>;

    clinicMemberRepository = {
      findActiveByClinicAndUser: jest.fn(),
    } as unknown as Mocked<IClinicMemberRepository>;

    coverageRepository = {
      create: jest.fn(),
      findActiveOverlapping: jest.fn(),
      updateStatus: jest.fn(),
    } as unknown as Mocked<IClinicProfessionalCoverageRepository>;

    auditService = {
      register: jest.fn(),
    } as unknown as Mocked<ClinicAuditService>;

    coverageSchedulingService = {
      applyCoverage: jest.fn(),
      releaseCoverage: jest.fn(),
    } as unknown as Mocked<ClinicCoverageSchedulingService>;

    useCase = new CreateClinicProfessionalCoverageUseCase(
      clinicRepository,
      clinicMemberRepository,
      coverageRepository,
      auditService,
      coverageSchedulingService,
    );
  });

  it('cria cobertura temporaria quando os dados sao validos', async () => {
    const startAt = new Date(Date.now() + 1000 * 60 * 60); // +1h
    const endAt = new Date(Date.now() + 1000 * 60 * 60 * 4); // +4h
    const coverage: ClinicProfessionalCoverage = {
      id: 'coverage-1',
      tenantId: 'tenant-1',
      clinicId: 'clinic-1',
      professionalId: 'professional-1',
      coverageProfessionalId: 'professional-2',
      startAt,
      endAt,
      status: 'scheduled',
      createdBy: 'manager-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    };

    clinicRepository.findByTenant.mockResolvedValue(clinic);
    clinicMemberRepository.findActiveByClinicAndUser.mockResolvedValueOnce(
      buildMembership({ userId: 'professional-1' }),
    );
    clinicMemberRepository.findActiveByClinicAndUser.mockResolvedValueOnce(
      buildMembership({ id: 'membership-2', userId: 'professional-2' }),
    );
    coverageRepository.findActiveOverlapping.mockResolvedValue([]);
    coverageRepository.create.mockResolvedValue(coverage);

    const result = await useCase.executeOrThrow({
      tenantId: 'tenant-1',
      clinicId: 'clinic-1',
      professionalId: 'professional-1',
      coverageProfessionalId: 'professional-2',
      startAt,
      endAt,
      performedBy: 'manager-1',
      reason: 'Ferias',
      notes: 'Cobertura parcial da agenda',
    });

    expect(result).toBe(coverage);
    expect(coverageRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        clinicId: 'clinic-1',
        professionalId: 'professional-1',
        coverageProfessionalId: 'professional-2',
        startAt: expect.any(Date),
        endAt: expect.any(Date),
        reason: 'Ferias',
        notes: 'Cobertura parcial da agenda',
        performedBy: 'manager-1',
      }),
    );
    expect(auditService.register).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'clinic.staff.coverage_created',
        clinicId: 'clinic-1',
        tenantId: 'tenant-1',
      }),
    );
    expect(coverageSchedulingService.applyCoverage).not.toHaveBeenCalled();
  });

  it('falha quando a clinica nao existe', async () => {
    clinicRepository.findByTenant.mockResolvedValue(null);

    await expect(
      useCase.executeOrThrow({
        tenantId: 'tenant-1',
        clinicId: 'clinic-inexistente',
        professionalId: 'professional-1',
        coverageProfessionalId: 'professional-2',
        startAt: new Date(),
        endAt: new Date(Date.now() + 1000 * 60 * 60),
        performedBy: 'manager-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('ativa imediatamente e sincroniza agenda quando periodo ja esta em andamento', async () => {
    const startAt = new Date(Date.now() - 5 * 60 * 1000); // started 5 minutes ago
    const endAt = new Date(Date.now() + 60 * 60 * 1000); // ends in 1 hour
    const coverage: ClinicProfessionalCoverage = {
      id: 'coverage-1',
      tenantId: 'tenant-1',
      clinicId: 'clinic-1',
      professionalId: 'professional-1',
      coverageProfessionalId: 'professional-2',
      startAt,
      endAt,
      status: 'scheduled',
      createdBy: 'manager-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    };

    clinicRepository.findByTenant.mockResolvedValue(clinic);
    clinicMemberRepository.findActiveByClinicAndUser.mockResolvedValueOnce(
      buildMembership({ userId: 'professional-1' }),
    );
    clinicMemberRepository.findActiveByClinicAndUser.mockResolvedValueOnce(
      buildMembership({ id: 'membership-2', userId: 'professional-2' }),
    );
    coverageRepository.findActiveOverlapping.mockResolvedValue([]);
    coverageRepository.create.mockResolvedValue(coverage);

    const result = await useCase.executeOrThrow({
      tenantId: 'tenant-1',
      clinicId: 'clinic-1',
      professionalId: 'professional-1',
      coverageProfessionalId: 'professional-2',
      startAt,
      endAt,
      performedBy: 'manager-1',
    });

    expect(coverageRepository.updateStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        coverageId: coverage.id,
        status: 'active',
        updatedBy: 'manager-1',
      }),
    );
    expect(result.status).toBe('active');
    expect(coverageSchedulingService.applyCoverage).toHaveBeenCalledWith(
      expect.objectContaining({
        id: coverage.id,
        status: 'active',
      }),
      expect.objectContaining({
        triggeredBy: 'manager-1',
        triggerSource: 'manual',
      }),
    );
    expect(
      auditService.register.mock.calls.filter(
        ([payload]) => payload.event === 'clinic.staff.coverage_activated',
      ).length,
    ).toBe(1);
  });

  it('falha quando o periodo e invalido', async () => {
    clinicRepository.findByTenant.mockResolvedValue(clinic);

    const startAt = new Date(Date.now() + 1000 * 60 * 60);
    const endAt = new Date(Date.now() + 1000 * 30); // antes do start

    await expect(
      useCase.executeOrThrow({
        tenantId: 'tenant-1',
        clinicId: 'clinic-1',
        professionalId: 'professional-1',
        coverageProfessionalId: 'professional-2',
        startAt,
        endAt,
        performedBy: 'manager-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('falha quando profissional titular nao esta ativo', async () => {
    clinicRepository.findByTenant.mockResolvedValue(clinic);
    clinicMemberRepository.findActiveByClinicAndUser.mockResolvedValueOnce(null);

    await expect(
      useCase.executeOrThrow({
        tenantId: 'tenant-1',
        clinicId: 'clinic-1',
        professionalId: 'professional-1',
        coverageProfessionalId: 'professional-2',
        startAt: new Date(Date.now() + 1000 * 60 * 60),
        endAt: new Date(Date.now() + 1000 * 60 * 120),
        performedBy: 'manager-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('falha quando existe cobertura conflitante', async () => {
    clinicRepository.findByTenant.mockResolvedValue(clinic);
    clinicMemberRepository.findActiveByClinicAndUser
      .mockResolvedValueOnce(buildMembership({ userId: 'professional-1' }))
      .mockResolvedValueOnce(buildMembership({ id: 'membership-2', userId: 'professional-2' }));

    coverageRepository.findActiveOverlapping.mockResolvedValue([
      {
        id: 'coverage-existing',
      } as ClinicProfessionalCoverage,
    ]);

    await expect(
      useCase.executeOrThrow({
        tenantId: 'tenant-1',
        clinicId: 'clinic-1',
        professionalId: 'professional-1',
        coverageProfessionalId: 'professional-2',
        startAt: new Date(Date.now() + 1000 * 60 * 60),
        endAt: new Date(Date.now() + 1000 * 60 * 120),
        performedBy: 'manager-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('falha quando profissional de cobertura possui papel invalido', async () => {
    clinicRepository.findByTenant.mockResolvedValue(clinic);
    clinicMemberRepository.findActiveByClinicAndUser.mockResolvedValueOnce(
      buildMembership({ userId: 'professional-1' }),
    );
    clinicMemberRepository.findActiveByClinicAndUser.mockResolvedValueOnce(
      buildMembership({
        id: 'membership-2',
        userId: 'professional-2',
        role: RolesEnum.MANAGER,
      }),
    );

    await expect(
      useCase.executeOrThrow({
        tenantId: 'tenant-1',
        clinicId: 'clinic-1',
        professionalId: 'professional-1',
        coverageProfessionalId: 'professional-2',
        startAt: new Date(Date.now() + 1000 * 60 * 60),
        endAt: new Date(Date.now() + 1000 * 60 * 120),
        performedBy: 'manager-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
