import { Result } from '@shared/types/result.type';
import { AuthTokenPayload, RefreshTokenPayload, TwoFactorTokenPayload } from '../../types/auth.types';

/**
 * Interface para o serviço JWT
 */
export interface IJwtService {
  /**
   * Gerar access token
   */
  generateAccessToken(payload: Omit<AuthTokenPayload, 'iat' | 'exp'>): string;

  /**
   * Gerar refresh token
   */
  generateRefreshToken(payload: Omit<RefreshTokenPayload, 'iat' | 'exp'>): string;

  /**
   * Gerar token temporário para 2FA
   */
  generateTwoFactorToken(userId: string): string;

  /**
   * Verificar e decodificar access token
   */
  verifyAccessToken(token: string): Result<AuthTokenPayload>;

  /**
   * Verificar e decodificar refresh token
   */
  verifyRefreshToken(token: string): Result<RefreshTokenPayload>;

  /**
   * Verificar e decodificar token 2FA
   */
  verifyTwoFactorToken(token: string): Result<TwoFactorTokenPayload>;

  /**
   * Decodificar token sem verificar
   */
  decode<T = any>(token: string): T | null;
}

export const IJwtService = Symbol('IJwtService');