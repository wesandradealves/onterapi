import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import {
  type IClinicRepository,
  IClinicRepository as IClinicRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic.repository.interface';
import {
  type IClinicMemberRepository,
  IClinicMemberRepository as IClinicMemberRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-member.repository.interface';
import {
  type IClinicProfessionalCoverageRepository,
  IClinicProfessionalCoverageRepository as IClinicProfessionalCoverageRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-professional-coverage.repository.interface';
import {
  type ICreateClinicProfessionalCoverageUseCase,
  ICreateClinicProfessionalCoverageUseCase as ICreateClinicProfessionalCoverageUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/create-clinic-professional-coverage.use-case.interface';
import {
  ClinicMember,
  ClinicProfessionalCoverage,
  CreateClinicProfessionalCoverageInput,
} from '../../../domain/clinic/types/clinic.types';
import { RolesEnum } from '../../../domain/auth/enums/roles.enum';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';
import { ClinicAuditService } from '../../../infrastructure/clinic/services/clinic-audit.service';
import { ClinicCoverageSchedulingService } from '../services/clinic-coverage-scheduling.service';

@Injectable()
export class CreateClinicProfessionalCoverageUseCase
  extends BaseUseCase<CreateClinicProfessionalCoverageInput, ClinicProfessionalCoverage>
  implements ICreateClinicProfessionalCoverageUseCase
{
  private static readonly MAX_COVERAGE_DURATION_MS = 1000 * 60 * 60 * 24 * 31; // 31 dias
  private static readonly ALLOWED_PAST_DRIFT_MS = 1000 * 60 * 15; // 15 minutos

  protected readonly logger = new Logger(CreateClinicProfessionalCoverageUseCase.name);

  constructor(
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
    @Inject(IClinicMemberRepositoryToken)
    private readonly clinicMemberRepository: IClinicMemberRepository,
    @Inject(IClinicProfessionalCoverageRepositoryToken)
    private readonly coverageRepository: IClinicProfessionalCoverageRepository,
    private readonly auditService: ClinicAuditService,
    private readonly coverageSchedulingService: ClinicCoverageSchedulingService,
  ) {
    super();
  }

  protected async handle(
    input: CreateClinicProfessionalCoverageInput,
  ): Promise<ClinicProfessionalCoverage> {
    const clinic = await this.clinicRepository.findByTenant(input.tenantId, input.clinicId);

    if (!clinic) {
      throw ClinicErrorFactory.clinicNotFound('Clinica nao encontrada');
    }

    const { startAt, endAt } = this.normalizeAndValidatePeriod(input.startAt, input.endAt);

    if (input.professionalId === input.coverageProfessionalId) {
      throw ClinicErrorFactory.invalidClinicData(
        'O profissional responsavel pela cobertura deve ser diferente do titular',
      );
    }

    const [professionalMembership, coverageMembership] = await Promise.all([
      this.clinicMemberRepository.findActiveByClinicAndUser({
        clinicId: input.clinicId,
        tenantId: input.tenantId,
        userId: input.professionalId,
      }),
      this.clinicMemberRepository.findActiveByClinicAndUser({
        clinicId: input.clinicId,
        tenantId: input.tenantId,
        userId: input.coverageProfessionalId,
      }),
    ]);

    this.ensureActiveProfessionalMembership(
      professionalMembership,
      'Profissional titular nao esta ativo na clinica',
    );

    this.ensureActiveProfessionalMembership(
      coverageMembership,
      'Profissional de cobertura nao esta ativo na clinica',
    );

    const overlappingCoverages = await this.coverageRepository.findActiveOverlapping({
      tenantId: input.tenantId,
      clinicId: input.clinicId,
      professionalId: input.professionalId,
      coverageProfessionalId: input.coverageProfessionalId,
      startAt,
      endAt,
    });

    if (overlappingCoverages.length > 0) {
      throw ClinicErrorFactory.invalidClinicData(
        'Ja existe uma cobertura ativa que conflita com o periodo informado',
      );
    }

    const coverage = await this.coverageRepository.create({
      tenantId: input.tenantId,
      clinicId: input.clinicId,
      professionalId: input.professionalId,
      coverageProfessionalId: input.coverageProfessionalId,
      startAt,
      endAt,
      reason: input.reason,
      notes: input.notes,
      metadata: input.metadata ?? {},
      performedBy: input.performedBy,
    });

    await this.auditService.register({
      tenantId: input.tenantId,
      clinicId: input.clinicId,
      performedBy: input.performedBy,
      event: 'clinic.staff.coverage_created',
      detail: {
        coverageId: coverage.id,
        professionalId: input.professionalId,
        coverageProfessionalId: input.coverageProfessionalId,
        startAt: coverage.startAt.toISOString(),
        endAt: coverage.endAt.toISOString(),
        reason: coverage.reason ?? null,
        notes: coverage.notes ?? null,
      },
    });

    let effectiveCoverage = coverage;
    const now = new Date();
    const shouldActivateImmediately = startAt <= now && endAt > now;

    if (shouldActivateImmediately) {
      await this.coverageRepository.updateStatus({
        tenantId: input.tenantId,
        clinicId: input.clinicId,
        coverageId: coverage.id,
        status: 'active',
        updatedBy: input.performedBy,
      });

      effectiveCoverage = {
        ...coverage,
        status: 'active',
        updatedAt: now,
        updatedBy: input.performedBy,
      };

      await this.coverageSchedulingService.applyCoverage(effectiveCoverage, {
        triggeredBy: input.performedBy,
        triggerSource: 'manual',
      });

      await this.auditService.register({
        tenantId: input.tenantId,
        clinicId: input.clinicId,
        performedBy: input.performedBy,
        event: 'clinic.staff.coverage_activated',
        detail: {
          coverageId: coverage.id,
          professionalId: input.professionalId,
          coverageProfessionalId: input.coverageProfessionalId,
          startAt: coverage.startAt.toISOString(),
          endAt: coverage.endAt.toISOString(),
        },
      });
    }

    return effectiveCoverage;
  }

  private normalizeAndValidatePeriod(startAt: Date, endAt: Date): { startAt: Date; endAt: Date } {
    const normalizedStart = new Date(startAt);
    const normalizedEnd = new Date(endAt);

    if (Number.isNaN(normalizedStart.getTime()) || Number.isNaN(normalizedEnd.getTime())) {
      throw ClinicErrorFactory.invalidClinicData('Periodo de cobertura invalido');
    }

    if (normalizedStart.getTime() >= normalizedEnd.getTime()) {
      throw ClinicErrorFactory.invalidClinicData(
        'Data inicial da cobertura deve ser anterior a data final',
      );
    }

    if (
      normalizedEnd.getTime() - normalizedStart.getTime() >
      CreateClinicProfessionalCoverageUseCase.MAX_COVERAGE_DURATION_MS
    ) {
      throw ClinicErrorFactory.invalidClinicData(
        'Coberturas temporarias podem durar no maximo 31 dias',
      );
    }

    const now = Date.now();
    if (normalizedEnd.getTime() <= now) {
      throw ClinicErrorFactory.invalidClinicData(
        'Data final da cobertura deve ser futura em relacao ao momento atual',
      );
    }

    if (
      normalizedStart.getTime() <
      now - CreateClinicProfessionalCoverageUseCase.ALLOWED_PAST_DRIFT_MS
    ) {
      throw ClinicErrorFactory.invalidClinicData(
        'Data inicial da cobertura nao pode estar muito no passado',
      );
    }

    return { startAt: normalizedStart, endAt: normalizedEnd };
  }

  private ensureActiveProfessionalMembership(
    membership: ClinicMember | null,
    errorMessage: string,
  ): void {
    if (!membership) {
      throw ClinicErrorFactory.memberNotFound(errorMessage);
    }

    if (membership.status !== 'active') {
      throw ClinicErrorFactory.invalidClinicData(errorMessage);
    }

    if (membership.role !== RolesEnum.PROFESSIONAL) {
      throw ClinicErrorFactory.invalidClinicData(
        'Coberturas temporarias so podem envolver profissionais da clinica',
      );
    }
  }
}

export const CreateClinicProfessionalCoverageUseCaseToken =
  ICreateClinicProfessionalCoverageUseCaseToken;
