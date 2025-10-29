import { Result } from '../../../../shared/types/result.type';

export interface ResendVerificationEmailInput {
  email: string;
  requesterIp?: string;
  userAgent?: string;
}

export interface ResendVerificationEmailOutput {
  delivered: boolean;
  alreadyVerified: boolean;
  message: string;
}

export interface IResendVerificationEmailUseCase {
  execute(input: ResendVerificationEmailInput): Promise<Result<ResendVerificationEmailOutput>>;
  executeOrThrow(input: ResendVerificationEmailInput): Promise<ResendVerificationEmailOutput>;
}

export const IResendVerificationEmailUseCase = Symbol('IResendVerificationEmailUseCase');
