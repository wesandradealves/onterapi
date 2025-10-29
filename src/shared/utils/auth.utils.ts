import { AUTH_CONSTANTS, AUTH_PATTERNS } from '../constants/auth.constants';
import { RolesEnum } from '../../domain/auth/enums/roles.enum';
import { DeviceInfo } from '../types/device.types';
import { generateTwoFactorCode } from './crypto.util';

export function generateSixDigitCode(): string {
  return generateTwoFactorCode();
}

export function parseUserAgent(userAgent?: string): string {
  if (!userAgent) return AUTH_CONSTANTS.DEFAULT_VALUES.DEVICE;

  if (userAgent.includes('Windows')) return 'Windows PC';
  if (userAgent.includes('Mac')) return 'Mac';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('iPhone')) return 'iPhone';
  if (userAgent.includes('iPad')) return 'iPad';
  if (userAgent.includes('Android')) return 'Android';

  return AUTH_CONSTANTS.DEFAULT_VALUES.DEVICE;
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split(AUTH_PATTERNS.EMAIL_SPLIT_CHAR);
  const maskedLocal =
    local.length > 2
      ? local[0] + AUTH_PATTERNS.EMAIL_MASK_CHAR.repeat(local.length - 2) + local[local.length - 1]
      : local;
  return `${maskedLocal}@${domain}`;
}

export interface ExtractedUser {
  id: string;
  email: string;
  name: string;
  role: RolesEnum;
  tenantId: string | undefined;
  isActive?: boolean;
  emailConfirmed?: boolean;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const readString = (record: Record<string, unknown>, key: string): string | undefined => {
  const value = record[key];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return undefined;
};

const readBoolean = (record: Record<string, unknown>, key: string): boolean | undefined => {
  const value = record[key];
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'n'].includes(normalized)) {
      return false;
    }
  }
  return undefined;
};

const readMetadata = (
  record: Record<string, unknown>,
  key: string,
): Record<string, unknown> | undefined => {
  const value = record[key];
  return isRecord(value) ? value : undefined;
};

const resolveSupabasePayload = (supabaseData: unknown): Record<string, unknown> => {
  if (isRecord(supabaseData)) {
    const nestedUser = supabaseData.user;
    if (isRecord(nestedUser)) {
      return nestedUser;
    }
    return supabaseData;
  }
  throw new Error('Invalid Supabase user payload');
};

export function extractSupabaseUser(supabaseData: unknown): ExtractedUser {
  const payload = resolveSupabasePayload(supabaseData);
  const id = readString(payload, 'id');

  if (!id) {
    throw new Error('Supabase user is missing identifier');
  }

  const metadataRecord =
    readMetadata(payload, 'user_metadata') ?? readMetadata(payload, 'metadata') ?? {};

  const metadata = metadataRecord as Record<string, unknown>;

  const email = readString(payload, 'email') ?? '';
  const metadataName = readString(metadata, 'name');
  const name = metadataName ?? email.split(AUTH_PATTERNS.EMAIL_SPLIT_CHAR)[0] ?? '';

  const metadataRole = metadata.role;
  const resolvedRole = Object.values(RolesEnum).includes(metadataRole as RolesEnum)
    ? (metadataRole as RolesEnum)
    : (AUTH_CONSTANTS.DEFAULT_ROLE as RolesEnum);

  const tenantId =
    readString(metadata, 'tenantId') ?? readString(metadata, 'tenant_id') ?? undefined;

  const bannedUntil = readString(payload, 'banned_until');
  const isActiveFlag = readBoolean(metadata, 'isActive');
  const emailConfirmedAt = readString(payload, 'email_confirmed_at');
  const emailVerifiedMetadata = readBoolean(metadata, 'emailVerified');

  const twoFactorEnabledFlag =
    readBoolean(metadata, 'twoFactorEnabled') ?? readBoolean(metadata, 'two_factor_enabled');

  const twoFactorSecret =
    readString(metadata, 'twoFactorSecret') ?? readString(metadata, 'two_factor_secret') ?? null;

  return {
    id,
    email,
    name,
    role: resolvedRole,
    tenantId,
    isActive: isActiveFlag !== undefined ? isActiveFlag : !bannedUntil,
    emailConfirmed: emailVerifiedMetadata ?? Boolean(emailConfirmedAt),
    twoFactorEnabled: twoFactorEnabledFlag ?? false,
    twoFactorSecret,
  };
}

export function calculateExpirationDate(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

export function calculateExpirationMinutes(minutes: number): Date {
  const date = new Date();
  date.setMinutes(date.getMinutes() + minutes);
  return date;
}

export function getUserDisplayName(userData: unknown): string {
  try {
    const user = extractSupabaseUser(userData);
    return user.name || user.email.split(AUTH_PATTERNS.EMAIL_SPLIT_CHAR)[0];
  } catch {
    return 'Usuario';
  }
}

export function normalizeDeviceInfo(deviceInfo?: Partial<DeviceInfo>): DeviceInfo {
  const record = (deviceInfo as Record<string, unknown>) ?? {};
  const userAgent = readString(record, 'userAgent') ?? AUTH_CONSTANTS.DEFAULT_VALUES.USER_AGENT;
  const ip = readString(record, 'ip') ?? AUTH_CONSTANTS.DEFAULT_VALUES.IP;
  const device = readString(record, 'device') ?? parseUserAgent(userAgent);
  const location = readString(record, 'location') ?? AUTH_CONSTANTS.DEFAULT_VALUES.LOCATION;
  const browser = readString(record, 'browser');
  const os = readString(record, 'os');
  const trustedDeviceValue = record['trustedDevice'];
  const trustedDevice = typeof trustedDeviceValue === 'boolean' ? trustedDeviceValue : false;

  return {
    userAgent,
    ip,
    device,
    location,
    browser,
    os,
    trustedDevice,
  };
}

export function normalizeLoginInfo(user: ExtractedUser, deviceInfo?: DeviceInfo) {
  const normalized = deviceInfo ?? normalizeDeviceInfo();
  return {
    to: user.email,
    userName: user.name || user.email.split('@')[0],
    loginDate: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
    ipAddress: normalized.ip ?? AUTH_CONSTANTS.DEFAULT_VALUES.IP,
    userAgent: normalized.userAgent ?? AUTH_CONSTANTS.DEFAULT_VALUES.USER_AGENT,
    location: normalized.location ?? AUTH_CONSTANTS.DEFAULT_VALUES.LOCATION,
    device: normalized.device ?? parseUserAgent(normalized.userAgent),
  };
}
