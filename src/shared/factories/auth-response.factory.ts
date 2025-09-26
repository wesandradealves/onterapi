import { AUTH_CONSTANTS } from '../constants/auth.constants';
import { v4 as uuidv4 } from 'uuid';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface TokenResponse extends AuthTokens {
  user: AuthUser;
}

export interface TwoFactorTempResponse {
  requiresTwoFactor: boolean;
  tempToken: string;
}

export interface TwoFactorSendResponse {
  sentTo: string;
  method: string;
  expiresIn: number;
  attemptsRemaining: number;
}

export function createUserResponse(user: {
  id: string;
  email: string;
  name?: string;
  role?: string;
  tenantId?: string | null;
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? '',
    role: user.role ?? '',
    tenantId: user.tenantId ?? undefined,
  };
}

export function createTokenResponse(tokens: AuthTokens, user: AuthUser): TokenResponse {
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.expiresIn || AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRES_IN,
    user: createUserResponse(user),
  };
}

export function createTwoFactorTempResponse(tempToken: string): TwoFactorTempResponse {
  return {
    requiresTwoFactor: true,
    tempToken,
  };
}

export function createTwoFactorSendResponse(
  sentTo: string,
  method: 'email' | 'sms' = 'email',
  attemptsRemaining: number = AUTH_CONSTANTS.TWO_FACTOR_MAX_ATTEMPTS,
): TwoFactorSendResponse {
  return {
    sentTo,
    method,
    expiresIn: AUTH_CONSTANTS.TWO_FACTOR_CODE_EXPIRES_MINUTES * 60,
    attemptsRemaining,
  };
}

export function generateSessionId(): string {
  return uuidv4();
}
