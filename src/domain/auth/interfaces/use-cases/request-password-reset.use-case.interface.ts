import { Result } from '@shared/types/result.type';

export interface RequestPasswordResetInput {
  email: string;
  requesterIp?: string;
  userAgent?: string;
}

export interface RequestPasswordResetOutput {
  delivered: boolean;
  message: string;
}

export interface IRequestPasswordResetUseCase {
  execute(input: RequestPasswordResetInput): Promise<Result<RequestPasswordResetOutput>>;
  executeOrThrow(input: RequestPasswordResetInput): Promise<RequestPasswordResetOutput>;
}

export const IRequestPasswordResetUseCase = Symbol('IRequestPasswordResetUseCase');
