import { Result } from '@shared/types/result.type';

export interface IForgotPasswordUseCase {
  execute(input: ForgotPasswordInput): Promise<Result<ForgotPasswordOutput>>;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ForgotPasswordOutput {
  message: string;
  sentTo: string;
}

export const IForgotPasswordUseCase = Symbol('IForgotPasswordUseCase');