import { Result } from '@shared/types/result.type';

export interface IResetPasswordUseCase {
  execute(input: ResetPasswordInput): Promise<Result<ResetPasswordOutput>>;
}

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

export interface ResetPasswordOutput {
  message: string;
  email: string;
}

export const IResetPasswordUseCase = Symbol('IResetPasswordUseCase');
