import { Result } from '../../../../shared/types/result.type';
import { ClinicInvitation, ReissueClinicInvitationInput } from '../../types/clinic.types';

export interface IReissueClinicInvitationUseCase {
  execute(input: ReissueClinicInvitationInput): Promise<Result<ClinicInvitation>>;
  executeOrThrow(input: ReissueClinicInvitationInput): Promise<ClinicInvitation>;
}

export const IReissueClinicInvitationUseCase = Symbol('IReissueClinicInvitationUseCase');
