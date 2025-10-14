import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import {
  type IClinicConfigurationRepository,
  IClinicConfigurationRepository as IClinicConfigurationRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-configuration.repository.interface';
import {
  type IClinicAppointmentRepository,
  IClinicAppointmentRepository as IClinicAppointmentRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-appointment.repository.interface';
import {
  type CheckClinicProfessionalFinancialClearanceInput,
  ClinicPaymentStatus,
  ClinicProfessionalFinancialClearanceStatus,
} from '../../../domain/clinic/types/clinic.types';
import {
  type ICheckClinicProfessionalFinancialClearanceUseCase,
  ICheckClinicProfessionalFinancialClearanceUseCase as ICheckClinicProfessionalFinancialClearanceUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/check-clinic-professional-financial-clearance.use-case.interface';

const DEFAULT_PENDING_STATUSES: ClinicPaymentStatus[] = ['chargeback', 'failed'];

@Injectable()
export class CheckClinicProfessionalFinancialClearanceUseCase
  extends BaseUseCase<
    CheckClinicProfessionalFinancialClearanceInput,
    ClinicProfessionalFinancialClearanceStatus
  >
  implements ICheckClinicProfessionalFinancialClearanceUseCase
{
  protected readonly logger = new Logger(CheckClinicProfessionalFinancialClearanceUseCase.name);

  constructor(
    @Inject(IClinicConfigurationRepositoryToken)
    private readonly configurationRepository: IClinicConfigurationRepository,
    @Inject(IClinicAppointmentRepositoryToken)
    private readonly appointmentRepository: IClinicAppointmentRepository,
  ) {
    super();
  }

  protected async handle(
    input: CheckClinicProfessionalFinancialClearanceInput,
  ): Promise<ClinicProfessionalFinancialClearanceStatus> {
    const requireClearance = await this.requiresFinancialClearance(input.clinicId);

    if (!requireClearance) {
      return {
        requiresClearance: false,
        hasPendencies: false,
        pendingCount: 0,
        statusesEvaluated: [],
      };
    }

    if (!input.professionalId) {
      return {
        requiresClearance: true,
        hasPendencies: false,
        pendingCount: 0,
        statusesEvaluated: DEFAULT_PENDING_STATUSES,
      };
    }

    const pendingCount = await this.appointmentRepository.countByProfessionalAndPaymentStatus({
      clinicId: input.clinicId,
      tenantId: input.tenantId,
      professionalId: input.professionalId,
      statuses: DEFAULT_PENDING_STATUSES,
    });

    return {
      requiresClearance: true,
      hasPendencies: pendingCount > 0,
      pendingCount,
      statusesEvaluated: DEFAULT_PENDING_STATUSES,
    };
  }

  private async requiresFinancialClearance(clinicId: string): Promise<boolean> {
    const version = await this.configurationRepository.findLatestAppliedVersion(clinicId, 'team');

    if (!version || !version.payload || typeof version.payload !== 'object') {
      return false;
    }

    const payload = version.payload as Record<string, unknown>;

    if (typeof payload.requireFinancialClearance === 'boolean') {
      return payload.requireFinancialClearance;
    }

    const nested = payload.teamSettings;
    if (nested && typeof nested === 'object') {
      const nestedValue = (nested as Record<string, unknown>).requireFinancialClearance;
      if (typeof nestedValue === 'boolean') {
        return nestedValue;
      }
    }

    return false;
  }
}

export const CheckClinicProfessionalFinancialClearanceUseCaseToken =
  ICheckClinicProfessionalFinancialClearanceUseCaseToken;
