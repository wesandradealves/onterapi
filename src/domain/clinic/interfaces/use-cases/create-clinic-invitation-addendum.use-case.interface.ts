import { Result } from '../../../../shared/types/result.type';
import { ClinicInvitation, CreateClinicInvitationAddendumInput } from '../../types/clinic.types';

export interface ICreateClinicInvitationAddendumUseCase {
  execute(input: CreateClinicInvitationAddendumInput): Promise<Result<ClinicInvitation>>;
  executeOrThrow(input: CreateClinicInvitationAddendumInput): Promise<ClinicInvitation>;
}

export const ICreateClinicInvitationAddendumUseCase = Symbol(
  'ICreateClinicInvitationAddendumUseCase',
);
