import { Result } from '@shared/types/result.type';

/**
 * Interface do caso de uso de login
 */
export interface ISignInUseCase {
  execute(input: SignInInput): Promise<Result<SignInOutput>>;
}

export interface SignInInput {
  email: string;
  password: string;
  rememberMe?: boolean;
  deviceInfo?: {
    userAgent?: string;
    ip?: string;
    device?: string;
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