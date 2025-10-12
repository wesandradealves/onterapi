import { Result } from '../../../../shared/types/result.type';
import {
  ClinicMember,
  ClinicMemberStatus,
  ClinicStaffRole,
} from '../../types/clinic.types';

export interface IListClinicMembersUseCase {
  execute(input: {
    clinicId: string;
    tenantId: string;
    status?: ClinicMemberStatus[];
    roles?: ClinicStaffRole[];
    page?: number;
    limit?: number;
  }): Promise<Result<{ data: ClinicMember[]; total: number }>>;
  executeOrThrow(input: {
    clinicId: string;
    tenantId: string;
    status?: ClinicMemberStatus[];
    roles?: ClinicStaffRole[];
    page?: number;
    limit?: number;
  }): Promise<{ data: ClinicMember[]; total: number }>;
}

export const IListClinicMembersUseCase = Symbol('IListClinicMembersUseCase');
