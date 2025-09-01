import { Result } from '@shared/types/result.type';

/**
 * Interface do caso de uso de refresh token
 */
export interface IRefreshTokenUseCase {
  execute(input: RefreshTokenInput): Promise<Result<RefreshTokenOutput>>;
}

export interface RefreshTokenInput {
  refreshToken: string;
  deviceInfo?: {
    userAgent?: string;
    ip?: string;
    device?: string;
  };
}

export interface RefreshTokenOutput {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId?: string;
  };
}

export const IRefreshTokenUseCase = Symbol('IRefreshTokenUseCase');