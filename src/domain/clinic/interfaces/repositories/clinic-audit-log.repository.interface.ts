import {
  ClinicAuditLog,
  CreateClinicAuditLogInput,
  ListClinicAuditLogsInput,
} from '../../types/clinic.types';

export interface IClinicAuditLogRepository {
  create(log: CreateClinicAuditLogInput): Promise<ClinicAuditLog>;
  list(input: ListClinicAuditLogsInput): Promise<{ data: ClinicAuditLog[]; total: number }>;
}

export const IClinicAuditLogRepository = Symbol('IClinicAuditLogRepository');
