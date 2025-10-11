import { Result } from '../../../../shared/types/result.type';
import { InviteClinicProfessionalInput, ClinicInvitation } from '../../types/clinic.types';

export interface IInviteClinicProfessionalUseCase {
  execute(input: InviteClinicProfessionalInput): Promise<Result<ClinicInvitation>>;
  executeOrThrow(input: InviteClinicProfessionalInput): Promise<ClinicInvitation>;
}

export const IInviteClinicProfessionalUseCase = Symbol('IInviteClinicProfessionalUseCase');
