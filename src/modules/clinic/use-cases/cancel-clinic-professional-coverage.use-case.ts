import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import {
  type IClinicProfessionalCoverageRepository,
  IClinicProfessionalCoverageRepository as IClinicProfessionalCoverageRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-professional-coverage.repository.interface';
import {
  type ICancelClinicProfessionalCoverageUseCase,
  ICancelClinicProfessionalCoverageUseCase as ICancelClinicProfessionalCoverageUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/cancel-clinic-professional-coverage.use-case.interface';
import {
  CancelClinicProfessionalCoverageInput,
  ClinicProfessionalCoverage,
} from '../../../domain/clinic/types/clinic.types';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';
import { ClinicAuditService } from '../../../infrastructure/clinic/services/clinic-audit.service';
import { ClinicCoverageSchedulingService } from '../services/clinic-coverage-scheduling.service';

@Injectable()
export class CancelClinicProfessionalCoverageUseCase
  extends BaseUseCase<CancelClinicProfessionalCoverageInput, ClinicProfessionalCoverage>
  implements ICancelClinicProfessionalCoverageUseCase
{
  protected readonly logger = new Logger(CancelClinicProfessionalCoverageUseCase.name);

  constructor(
    @Inject(IClinicProfessionalCoverageRepositoryToken)
    private readonly coverageRepository: IClinicProfessionalCoverageRepository,
    private readonly auditService: ClinicAuditService,
    private readonly coverageSchedulingService: ClinicCoverageSchedulingService,
  ) {
    super();
  }

  protected async handle(
    input: CancelClinicProfessionalCoverageInput,
  ): Promise<ClinicProfessionalCoverage> {
    const coverage = await this.coverageRepository.findById({
      tenantId: input.tenantId,
      clinicId: input.clinicId,
      coverageId: input.coverageId,
    });

    if (!coverage) {
      throw ClinicErrorFactory.coverageNotFound('Cobertura temporaria nao encontrada');
    }

    if (coverage.status === 'cancelled') {
      throw ClinicErrorFactory.invalidClinicData('Cobertura temporaria ja foi cancelada');
    }

    if (coverage.status === 'completed') {
      throw ClinicErrorFactory.invalidClinicData('Coberturas concluidas nao podem ser canceladas');
    }

    const cancelledCoverage = await this.coverageRepository.cancel({
      tenantId: input.tenantId,
      clinicId: input.clinicId,
      coverageId: input.coverageId,
      cancelledBy: input.cancelledBy,
      cancellationReason: input.cancellationReason,
    });

    if (!cancelledCoverage) {
      throw ClinicErrorFactory.coverageNotFound('Cobertura temporaria nao encontrada');
    }

    await this.auditService.register({
      tenantId: input.tenantId,
      clinicId: input.clinicId,
      performedBy: input.cancelledBy,
      event: 'clinic.staff.coverage_cancelled',
      detail: {
        coverageId: cancelledCoverage.id,
        professionalId: cancelledCoverage.professionalId,
        coverageProfessionalId: cancelledCoverage.coverageProfessionalId,
        cancelledAt: cancelledCoverage.cancelledAt?.toISOString() ?? new Date().toISOString(),
        reason: input.cancellationReason ?? null,
      },
    });

    await this.coverageSchedulingService.releaseCoverage(cancelledCoverage, {
      reference: new Date(),
      triggeredBy: input.cancelledBy,
      triggerSource: 'manual',
    });

    return cancelledCoverage;
  }
}

export const CancelClinicProfessionalCoverageUseCaseToken =
  ICancelClinicProfessionalCoverageUseCaseToken;
