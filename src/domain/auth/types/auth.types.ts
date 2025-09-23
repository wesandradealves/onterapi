import { RolesEnum } from '../enums/roles.enum';

export type AuthTokenPayload = {
  sub: string;
  email: string;
  role: RolesEnum;
  tenantId?: string;
  sessionId: string;
  iat: number;
  exp: number;
};

export type RefreshTokenPayload = {
  sub: string;
  sessionId: string;
  iat: number;
  exp: number;
};

export type TwoFactorTokenPayload = {
  sub: string;
  purpose: 'two-factor';
  iat: number;
  exp: number;
};

export type EmailVerificationTokenPayload = {
  sub: string;
  email: string;
  purpose: 'email-verification';
  iat: number;
  exp: number;
};

export type PasswordResetTokenPayload = {
  sub: string;
  email: string;
  purpose: 'password-reset';
  iat: number;
  exp: number;
};

export type LoginAttempt = {
  email: string;
  ip: string;
  userAgent: string;
  success: boolean;
  reason?: string;
  timestamp: Date;
};

export type AuditLog = {
  userId: string;
  action: string;
  resource?: string;
  resourceId?: string;
  tenantId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  timestamp: Date;
};

export type PermissionCheck = {
  userId: string;
  permission: string;
  resource?: string;
  tenantId?: string;
};

export type RateLimitConfig = {
  windowMs: number;
  maxAttempts: number;
  blockDuration?: number;
};

export type SecurityConfig = {
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSpecialChars: boolean;
  maxLoginAttempts: number;
  lockoutDuration: number;
  sessionTimeout: number;
  refreshTokenExpiry: number;
  accessTokenExpiry: number;
  twoFactorCodeExpiry: number;
  emailVerificationExpiry: number;
  passwordResetExpiry: number;
};
