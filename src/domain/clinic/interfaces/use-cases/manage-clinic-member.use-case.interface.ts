import { Result } from '../../../../shared/types/result.type';
import { ClinicMember, ManageClinicMemberInput } from '../../types/clinic.types';

export interface IManageClinicMemberUseCase {
  execute(input: ManageClinicMemberInput): Promise<Result<ClinicMember>>;
  executeOrThrow(input: ManageClinicMemberInput): Promise<ClinicMember>;
}

export const IManageClinicMemberUseCase = Symbol('IManageClinicMemberUseCase');
