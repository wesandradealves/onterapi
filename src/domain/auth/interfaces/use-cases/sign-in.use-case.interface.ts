import { Result } from '@shared/types/result.type';

export interface ISignInUseCase {
  execute(input: SignInInput): Promise<Result<SignInOutput>>;
  executeOrThrow(input: SignInInput): Promise<SignInOutput>;
}

export interface SignInInput {
  email: string;
  password: string;
  rememberMe?: boolean;
  deviceInfo?: {
    userAgent?: string;
    ip?: string;
    device?: string;
    location?: string;
    trustedDevice?: boolean;
  };
}

export interface SignInOutput {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  requiresTwoFactor?: boolean;
  tempToken?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId?: string;
  };
}

export const ISignInUseCase = Symbol('ISignInUseCase');
