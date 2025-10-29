import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import {
  type IClinicAuditLogRepository,
  IClinicAuditLogRepository as IClinicAuditLogRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-audit-log.repository.interface';
import { ClinicAuditLog } from '../../../domain/clinic/types/clinic.types';
import {
  type IListClinicAuditLogsUseCase,
  IListClinicAuditLogsUseCase as IListClinicAuditLogsUseCaseToken,
  ListClinicAuditLogsUseCaseInput,
} from '../../../domain/clinic/interfaces/use-cases/list-clinic-audit-logs.use-case.interface';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';
import {
  type IClinicRepository,
  IClinicRepository as IClinicRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic.repository.interface';

@Injectable()
export class ListClinicAuditLogsUseCase
  extends BaseUseCase<ListClinicAuditLogsUseCaseInput, { data: ClinicAuditLog[]; total: number }>
  implements IListClinicAuditLogsUseCase
{
  protected readonly logger = new Logger(ListClinicAuditLogsUseCase.name);

  constructor(
    @Inject(IClinicAuditLogRepositoryToken)
    private readonly auditRepository: IClinicAuditLogRepository,
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
  ) {
    super();
  }

  protected async handle(
    input: ListClinicAuditLogsUseCaseInput,
  ): Promise<{ data: ClinicAuditLog[]; total: number }> {
    const clinic = await this.clinicRepository.findByTenant(input.tenantId, input.clinicId);

    if (!clinic) {
      throw ClinicErrorFactory.clinicNotFound('Clinica nao encontrada');
    }

    return this.auditRepository.list({
      tenantId: input.tenantId,
      clinicId: input.clinicId,
      events: input.events,
      page: input.page,
      limit: input.limit,
    });
  }
}

export const ListClinicAuditLogsUseCaseToken = IListClinicAuditLogsUseCaseToken;
