import { Result } from '../../../../shared/types/result.type';
import { ClinicInvitation, RevokeClinicInvitationInput } from '../../types/clinic.types';

export interface IRevokeClinicInvitationUseCase {
  execute(input: RevokeClinicInvitationInput): Promise<Result<ClinicInvitation>>;
  executeOrThrow(input: RevokeClinicInvitationInput): Promise<ClinicInvitation>;
}

export const IRevokeClinicInvitationUseCase = Symbol('IRevokeClinicInvitationUseCase');
