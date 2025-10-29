import {
  AddClinicMemberInput,
  ClinicMember,
  ClinicMemberStatus,
  ClinicStaffRole,
  ManageClinicMemberInput,
  RemoveClinicMemberInput,
} from '../../types/clinic.types';

export interface IClinicMemberRepository {
  addMember(input: AddClinicMemberInput): Promise<ClinicMember>;
  updateMember(input: ManageClinicMemberInput): Promise<ClinicMember>;
  removeMember(input: RemoveClinicMemberInput): Promise<void>;
  findById(memberId: string): Promise<ClinicMember | null>;
  findByUser(clinicId: string, userId: string): Promise<ClinicMember | null>;
  findActiveByClinicAndUser(params: {
    clinicId: string;
    tenantId: string;
    userId: string;
  }): Promise<ClinicMember | null>;
  listActiveByUser(params: { tenantId: string; userId: string }): Promise<ClinicMember[]>;
  countActiveProfessionalsByClinics(params: {
    tenantId: string;
    clinicIds: string[];
  }): Promise<Record<string, number>>;
  transferProfessional(params: {
    tenantId: string;
    professionalId: string;
    fromClinicId: string;
    toClinicId: string;
    effectiveDate: Date;
  }): Promise<{ fromMembership: ClinicMember; toMembership: ClinicMember }>;
  listMembers(params: {
    clinicId: string;
    tenantId: string;
    status?: ClinicMemberStatus[];
    roles?: ClinicStaffRole[];
    page?: number;
    limit?: number;
  }): Promise<{ data: ClinicMember[]; total: number }>;
  countByRole(clinicId: string): Promise<Record<ClinicStaffRole, number>>;
  hasQuotaAvailable(params: {
    clinicId: string;
    role: ClinicStaffRole;
    limit: number;
  }): Promise<boolean>;
}

export const IClinicMemberRepository = Symbol('IClinicMemberRepository');
