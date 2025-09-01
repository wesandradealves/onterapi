import { Result } from '@shared/types/result.type';

/**
 * Interface do caso de uso de verificação de email
 */
export interface IVerifyEmailUseCase {
  execute(input: VerifyEmailInput): Promise<Result<VerifyEmailOutput>>;
}

export interface VerifyEmailInput {
  token: string;
}

export interface VerifyEmailOutput {
  message: string;
  email: string;
  userId: string;
}

export const IVerifyEmailUseCase = Symbol('IVerifyEmailUseCase');