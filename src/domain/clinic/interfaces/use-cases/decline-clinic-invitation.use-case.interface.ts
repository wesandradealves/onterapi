import { Result } from '../../../../shared/types/result.type';
import { ClinicInvitation, DeclineClinicInvitationInput } from '../../types/clinic.types';

export interface IDeclineClinicInvitationUseCase {
  execute(input: DeclineClinicInvitationInput): Promise<Result<ClinicInvitation>>;
  executeOrThrow(input: DeclineClinicInvitationInput): Promise<ClinicInvitation>;
}

export const IDeclineClinicInvitationUseCase = Symbol('IDeclineClinicInvitationUseCase');
