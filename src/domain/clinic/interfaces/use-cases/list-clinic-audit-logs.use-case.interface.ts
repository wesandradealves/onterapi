import { ClinicAuditLog, ListClinicAuditLogsInput } from '../../types/clinic.types';

export interface ListClinicAuditLogsUseCaseInput extends ListClinicAuditLogsInput {
  clinicId: string;
}

export interface IListClinicAuditLogsUseCase {
  execute(
    input: ListClinicAuditLogsUseCaseInput,
  ): Promise<{ data: ClinicAuditLog[]; total: number }>;
  executeOrThrow(
    input: ListClinicAuditLogsUseCaseInput,
  ): Promise<{ data: ClinicAuditLog[]; total: number }>;
}

export const IListClinicAuditLogsUseCase = Symbol('IListClinicAuditLogsUseCase');
