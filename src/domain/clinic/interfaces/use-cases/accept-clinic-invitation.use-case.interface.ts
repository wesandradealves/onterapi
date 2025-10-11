import { Result } from '../../../../shared/types/result.type';
import { AcceptClinicInvitationInput, ClinicInvitation } from '../../types/clinic.types';

export interface IAcceptClinicInvitationUseCase {
  execute(input: AcceptClinicInvitationInput): Promise<Result<ClinicInvitation>>;
  executeOrThrow(input: AcceptClinicInvitationInput): Promise<ClinicInvitation>;
}

export const IAcceptClinicInvitationUseCase = Symbol('IAcceptClinicInvitationUseCase');
