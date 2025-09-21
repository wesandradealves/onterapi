import { maskEmail } from './auth.utils';

interface MaskSecretOptions {
  visiblePrefix?: number;
  visibleSuffix?: number;
  maskChar?: string;
}

export function shouldLogSensitiveData(): boolean {
  return (process.env.NODE_ENV || 'development') !== 'production';
}

export function maskSecret(value?: string, options: MaskSecretOptions = {}): string {
  const secret = value ?? '';
  if (!secret) {
    return '';
  }

  const { visiblePrefix = 2, visibleSuffix = 2, maskChar = '*' } = options;
  if (secret.length <= visiblePrefix + visibleSuffix) {
    return maskChar.repeat(secret.length);
  }

  const prefix = secret.slice(0, visiblePrefix);
  const suffix = secret.slice(secret.length - visibleSuffix);
  const masked = maskChar.repeat(secret.length - (visiblePrefix + visibleSuffix));

  return `${prefix}${masked}${suffix}`;
}

export function maskEmailForLog(email?: string): string {
  if (!email) {
    return '';
  }

  try {
    return maskEmail(email);
  } catch {
    return maskSecret(email, { visiblePrefix: 1, visibleSuffix: 1 });
  }
}

export function buildUserLogPayload(user: { id?: string; email?: string | null; role?: string | null; tenantId?: string | null }) {
  return {
    userId: user?.id ?? 'unknown',
    email: maskEmailForLog(user?.email ?? undefined),
    role: user?.role ?? 'unknown',
    tenantId: user?.tenantId ?? null,
  };
}
