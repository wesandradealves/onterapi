import {
  AcceptClinicInvitationInput,
  ClinicInvitation,
  ClinicInvitationStatus,
  InviteClinicProfessionalInput,
  RevokeClinicInvitationInput,
} from '../../types/clinic.types';

export interface IClinicInvitationRepository {
  create(input: InviteClinicProfessionalInput & { tokenHash: string }): Promise<ClinicInvitation>;
  findById(invitationId: string): Promise<ClinicInvitation | null>;
  findByTokenHash(tokenHash: string): Promise<ClinicInvitation | null>;
  listPending(params: {
    clinicId: string;
    tenantId: string;
    status?: ClinicInvitationStatus[];
    page?: number;
    limit?: number;
  }): Promise<{ data: ClinicInvitation[]; total: number }>;
  markAccepted(input: AcceptClinicInvitationInput): Promise<ClinicInvitation>;
  markDeclined(params: {
    invitationId: string;
    tenantId: string;
    declinedBy: string;
  }): Promise<ClinicInvitation>;
  markRevoked(input: RevokeClinicInvitationInput): Promise<ClinicInvitation>;
  expireInvitation(invitationId: string): Promise<ClinicInvitation>;
  expireInvitationsBefore(referenceDate: Date): Promise<number>;
  hasActiveInvitation(params: {
    clinicId: string;
    tenantId: string;
    professionalId?: string;
    email?: string;
  }): Promise<boolean>;
}

export const IClinicInvitationRepository = Symbol('IClinicInvitationRepository');
