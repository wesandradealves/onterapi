import { AUTH_CONSTANTS, AUTH_PATTERNS } from '../constants/auth.constants';
import { RolesEnum } from '../../domain/auth/enums/roles.enum';
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
  const maskedLocal = local.length > 2 
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

export function extractSupabaseUser(supabaseData: any): ExtractedUser {
  const userData = supabaseData.user || supabaseData;
  const metadata = userData.user_metadata || userData.metadata || {};
  
  return {
    id: userData.id,
    email: userData.email || '',
    name: metadata.name || userData.email?.split(AUTH_PATTERNS.EMAIL_SPLIT_CHAR)[0] || '',
    role: (metadata.role as RolesEnum) || (AUTH_CONSTANTS.DEFAULT_ROLE as RolesEnum),
    tenantId: metadata.tenantId || undefined,
    isActive: !(userData as any).banned_until && metadata.isActive !== false,
    emailConfirmed: userData.email_confirmed_at !== null || metadata.emailVerified === true,
    twoFactorEnabled: metadata.twoFactorEnabled || false,
    twoFactorSecret: metadata.twoFactorSecret || null,
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

export function getUserDisplayName(userData: any): string {
  const user = extractSupabaseUser(userData);
  return user.name || user.email.split(AUTH_PATTERNS.EMAIL_SPLIT_CHAR)[0];
}

export interface DeviceInfo {
  userAgent?: string;
  ip?: string;
  device?: string;
  location?: string;
  trustedDevice?: boolean;
}

export function normalizeDeviceInfo(deviceInfo?: any): DeviceInfo {
  return {
    userAgent: deviceInfo?.userAgent || AUTH_CONSTANTS.DEFAULT_VALUES.USER_AGENT,
    ip: deviceInfo?.ip || AUTH_CONSTANTS.DEFAULT_VALUES.IP,
    device: deviceInfo?.device || parseUserAgent(deviceInfo?.userAgent),
    location: deviceInfo?.location || AUTH_CONSTANTS.DEFAULT_VALUES.LOCATION,
    trustedDevice: deviceInfo?.trustedDevice || false,
  };
}

export function normalizeLoginInfo(user: ExtractedUser, deviceInfo?: any) {
  const normalized = normalizeDeviceInfo(deviceInfo);
  return {
    to: user.email,
    userName: user.name || user.email.split('@')[0],
    loginDate: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
    ipAddress: normalized.ip!,
    userAgent: normalized.userAgent!,
    location: normalized.location!,
    device: normalized.device!,
  };
}