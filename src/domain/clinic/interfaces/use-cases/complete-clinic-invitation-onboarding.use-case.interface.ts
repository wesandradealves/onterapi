import { Result } from '../../../../shared/types/result.type';
import { ClinicInvitation } from '../../types/clinic.types';
import { UserEntity } from '../../../../infrastructure/auth/entities/user.entity';

export interface CompleteClinicInvitationOnboardingInput {
  tenantId: string;
  invitationId: string;
  token: string;
  name: string;
  cpf: string;
  phone?: string;
  password: string;
}

export interface CompleteClinicInvitationOnboardingOutput {
  invitation: ClinicInvitation;
  user: UserEntity;
}

export interface ICompleteClinicInvitationOnboardingUseCase {
  execute(
    input: CompleteClinicInvitationOnboardingInput,
  ): Promise<Result<CompleteClinicInvitationOnboardingOutput>>;
  executeOrThrow(
    input: CompleteClinicInvitationOnboardingInput,
  ): Promise<CompleteClinicInvitationOnboardingOutput>;
}

export const ICompleteClinicInvitationOnboardingUseCase = Symbol(
  'ICompleteClinicInvitationOnboardingUseCase',
);
