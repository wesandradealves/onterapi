import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import { IExportPatientsUseCase } from '../../../domain/patients/interfaces/use-cases/export-patients.use-case.interface';
import {
  IPatientRepository,
  IPatientRepositoryToken,
} from '../../../domain/patients/interfaces/repositories/patient.repository.interface';
import { RolesEnum } from '../../../domain/auth/enums/roles.enum';
import { mapRoleToDomain } from '../../../shared/utils/role.utils';
import { PatientExportRequest } from '../../../domain/patients/types/patient.types';
import { PatientErrorFactory } from '../../../shared/factories/patient-error.factory';
import { PatientAuditService } from '../../../infrastructure/patients/services/patient-audit.service';

@Injectable()
export class ExportPatientsUseCase
  extends BaseUseCase<PatientExportRequest, { fileUrl: string }>
  implements IExportPatientsUseCase
{
  protected readonly logger = new Logger(ExportPatientsUseCase.name);

  constructor(
    @Inject(IPatientRepositoryToken)
    private readonly patientRepository: IPatientRepository,
    private readonly auditService: PatientAuditService,
  ) {
    super();
  }

  protected async handle(request: PatientExportRequest): Promise<{ fileUrl: string }> {
    const role = mapRoleToDomain(request.requesterRole);
    const allowedRoles: RolesEnum[] = [
      RolesEnum.CLINIC_OWNER,
      RolesEnum.MANAGER,
      RolesEnum.SUPER_ADMIN,
      RolesEnum.ADMIN_FINANCEIRO,
    ];

    if (!role || !allowedRoles.includes(role)) {
      throw PatientErrorFactory.unauthorized();
    }

    const fileUrl = await this.patientRepository.export({
      ...request,
      filters: request.filters,
    });

    await this.auditService.register('patient.export.requested', {
      tenantId: request.tenantId,
      requestedBy: request.requestedBy,
      filters: request.filters,
      format: request.format,
    });

    return { fileUrl };
  }
}

