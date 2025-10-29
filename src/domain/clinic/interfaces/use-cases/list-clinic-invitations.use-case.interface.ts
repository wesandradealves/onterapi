import { Result } from '../../../../shared/types/result.type';
import { ClinicInvitation, ClinicInvitationStatus } from '../../types/clinic.types';

export interface IListClinicInvitationsUseCase {
  execute(input: {
    clinicId: string;
    tenantId: string;
    status?: ClinicInvitationStatus[];
    page?: number;
    limit?: number;
  }): Promise<Result<{ data: ClinicInvitation[]; total: number }>>;
  executeOrThrow(input: {
    clinicId: string;
    tenantId: string;
    status?: ClinicInvitationStatus[];
    page?: number;
    limit?: number;
  }): Promise<{ data: ClinicInvitation[]; total: number }>;
}

export const IListClinicInvitationsUseCase = Symbol('IListClinicInvitationsUseCase');
