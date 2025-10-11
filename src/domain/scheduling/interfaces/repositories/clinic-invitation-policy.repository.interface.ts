import { ClinicInvitationPolicy, InvitationChannel } from '../../types/scheduling.types';

export interface UpsertClinicInvitationPolicyInput
  extends Omit<ClinicInvitationPolicy, 'id' | 'createdAt' | 'updatedAt'> {
  id?: string;
}

export interface IClinicInvitationPolicyRepository {
  upsert(data: UpsertClinicInvitationPolicyInput): Promise<ClinicInvitationPolicy>;
  findEffectivePolicy(
    tenantId: string,
    clinicId: string,
    professionalId: string,
    channel: InvitationChannel,
    atUtc: Date,
  ): Promise<ClinicInvitationPolicy | null>;
  listByProfessional(tenantId: string, professionalId: string): Promise<ClinicInvitationPolicy[]>;
  remove(tenantId: string, policyId: string): Promise<void>;
}

export const IClinicInvitationPolicyRepositoryToken = Symbol('IClinicInvitationPolicyRepository');
