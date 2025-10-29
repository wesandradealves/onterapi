import { Result } from '../../../../shared/types/result.type';

export interface ConfirmPasswordResetInput {
  accessToken: string;
  newPassword: string;
  refreshToken?: string;
}

export interface ConfirmPasswordResetOutput {
  success: boolean;
  message: string;
}

export interface IConfirmPasswordResetUseCase {
  execute(input: ConfirmPasswordResetInput): Promise<Result<ConfirmPasswordResetOutput>>;
  executeOrThrow(input: ConfirmPasswordResetInput): Promise<ConfirmPasswordResetOutput>;
}

export const IConfirmPasswordResetUseCase = Symbol('IConfirmPasswordResetUseCase');
