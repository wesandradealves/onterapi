import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  type IClinicAuditLogRepository,
  IClinicAuditLogRepository as IClinicAuditLogRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-audit-log.repository.interface';
import { CreateClinicAuditLogInput } from '../../../domain/clinic/types/clinic.types';

export interface RegisterClinicAuditLogParams {
  tenantId: string;
  event: string;
  clinicId?: string;
  performedBy?: string;
  detail?: Record<string, unknown>;
}

@Injectable()
export class ClinicAuditService {
  private readonly logger = new Logger(ClinicAuditService.name);

  constructor(
    @Inject(IClinicAuditLogRepositoryToken)
    private readonly auditRepository: IClinicAuditLogRepository,
  ) {}

  async register(params: RegisterClinicAuditLogParams): Promise<void> {
    const payload: CreateClinicAuditLogInput = {
      tenantId: params.tenantId,
      clinicId: params.clinicId,
      event: params.event,
      performedBy: params.performedBy,
      detail: params.detail ?? {},
    };

    try {
      await this.auditRepository.create(payload);
    } catch (error) {
      this.logger.error(`Erro ao registrar auditoria ${params.event}`, (error as Error)?.stack);
    }
  }
}
