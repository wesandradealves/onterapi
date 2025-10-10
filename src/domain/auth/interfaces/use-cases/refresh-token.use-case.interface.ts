import { Result } from '../../../../shared/types/result.type';

export interface IRefreshTokenUseCase {
  execute(input: RefreshTokenInput): Promise<Result<RefreshTokenOutput>>;
  executeOrThrow(input: RefreshTokenInput): Promise<RefreshTokenOutput>;
}

export interface RefreshTokenInput {
  refreshToken: string;
  deviceInfo?: {
    userAgent?: string;
    ip?: string;
    device?: string;
    location?: string;
    trustedDevice?: boolean;
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
