import { Result } from '@shared/types/result.type';
import {
  AuthTokenPayload,
  RefreshTokenPayload,
  TwoFactorTokenPayload,
} from '../../types/auth.types';

export interface IJwtService {
  generateAccessToken(payload: Omit<AuthTokenPayload, 'iat' | 'exp'>): string;

  generateRefreshToken(payload: Omit<RefreshTokenPayload, 'iat' | 'exp'>): string;

  generateTwoFactorToken(userId: string): string;

  verifyAccessToken(token: string): Result<AuthTokenPayload>;

  verifyRefreshToken(token: string): Result<RefreshTokenPayload>;

  verifyTwoFactorToken(token: string): Result<TwoFactorTokenPayload>;

  decode<T = unknown>(token: string): T | null;
}

export const IJwtService = Symbol('IJwtService');
