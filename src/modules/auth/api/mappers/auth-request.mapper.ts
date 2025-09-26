import { SignInInputDTO } from '../schemas/sign-in.schema';
import { ResendVerificationEmailSchemaType } from '../schemas/resend-verification.schema';
import { RequestPasswordResetSchemaType } from '../schemas/request-password-reset.schema';
import { ConfirmPasswordResetSchemaType } from '../schemas/confirm-password-reset.schema';
import { RefreshTokenInputDTO } from '../schemas/refresh.schema';
import { SignOutSchemaType } from '../schemas/sign-out.schema';
import { SendTwoFAInputDTO, ValidateTwoFAInputDTO } from '../schemas/two-fa.schema';
import { SignInInput } from '../../../../domain/auth/interfaces/use-cases/sign-in.use-case.interface';
import { ResendVerificationEmailInput } from '../../../../domain/auth/interfaces/use-cases/resend-verification-email.use-case.interface';
import { RequestPasswordResetInput } from '../../../../domain/auth/interfaces/use-cases/request-password-reset.use-case.interface';
import { ConfirmPasswordResetInput } from '../../../../domain/auth/interfaces/use-cases/confirm-password-reset.use-case.interface';
import { SignOutInput } from '../../../../domain/auth/interfaces/use-cases/sign-out.use-case.interface';
import { RefreshTokenInput } from '../../../../domain/auth/interfaces/use-cases/refresh-token.use-case.interface';
import { ValidateTwoFAInput } from '../../../../domain/auth/interfaces/use-cases/validate-two-fa.use-case.interface';
import { SendTwoFAInput } from '../../../../domain/auth/interfaces/use-cases/send-two-fa.use-case.interface';

interface DeviceInfoInput {
  userAgent?: string;
  ip?: string;
  device?: string;
}

export interface RequestFingerprint {
  userAgentHeader?: string | string[];
  ip?: string;
}

const pickHeaderValue = (header?: string | string[]): string | undefined => {
  if (Array.isArray(header)) {
    return header.length > 0 ? header[0] : undefined;
  }
  return header;
};

const cleanValue = (value?: string | null): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const normalizeDeviceInfo = (
  payload?: DeviceInfoInput,
  fallback?: Partial<DeviceInfoInput>,
): DeviceInfoInput => {
  const merged: DeviceInfoInput = {
    userAgent: cleanValue(payload?.userAgent ?? fallback?.userAgent ?? undefined),
    ip: cleanValue(payload?.ip ?? fallback?.ip ?? undefined),
    device: cleanValue(payload?.device ?? fallback?.device ?? undefined),
  };

  const result: DeviceInfoInput = {};

  if (merged.userAgent) {
    result.userAgent = merged.userAgent;
  }
  if (merged.ip) {
    result.ip = merged.ip;
  }
  if (merged.device) {
    result.device = merged.device;
  }

  return Object.keys(result).length > 0 ? result : {};
};

export const toSignInInput = (
  dto: SignInInputDTO,
  fingerprint?: RequestFingerprint,
): SignInInput => {
  const deviceInfo = normalizeDeviceInfo(dto.deviceInfo, {
    userAgent: cleanValue(pickHeaderValue(fingerprint?.userAgentHeader)),
    ip: cleanValue(fingerprint?.ip),
  });

  return {
    email: dto.email,
    password: dto.password,
    rememberMe: dto.rememberMe,
    deviceInfo,
  };
};

export const toRefreshTokenInput = (
  dto: RefreshTokenInputDTO,
  fingerprint?: RequestFingerprint,
): RefreshTokenInput => {
  const deviceInfo = normalizeDeviceInfo(dto.deviceInfo, {
    userAgent: cleanValue(pickHeaderValue(fingerprint?.userAgentHeader)),
    ip: cleanValue(fingerprint?.ip),
  });

  return {
    refreshToken: dto.refreshToken,
    deviceInfo,
  };
};

export const extractAccessToken = (authorization?: string): string => {
  if (!authorization) {
    return '';
  }

  const token = authorization.replace(/^Bearer\s+/i, '').trim();
  return token;
};

export const toSignOutInput = (
  userId: string,
  dto: SignOutSchemaType,
  authorization?: string,
): SignOutInput => ({
  userId,
  accessToken: extractAccessToken(authorization),
  refreshToken: dto?.refreshToken,
  allDevices: dto?.allDevices,
});

export const toValidateTwoFAInput = (
  dto: ValidateTwoFAInputDTO,
  fingerprint: RequestFingerprint,
): ValidateTwoFAInput => {
  const headerUserAgent = cleanValue(pickHeaderValue(fingerprint.userAgentHeader));
  const deviceInfo = normalizeDeviceInfo(dto.deviceInfo, {
    userAgent: headerUserAgent ?? 'two-factor-client',
    ip: cleanValue(fingerprint.ip),
  });

  return {
    userId: '',
    tempToken: dto.tempToken,
    code: dto.code,
    trustDevice: dto.trustDevice,
    deviceInfo,
  };
};

export const toSendTwoFAInput = (dto: SendTwoFAInputDTO): SendTwoFAInput => ({
  userId: '',
  tempToken: dto.tempToken,
  method: dto.method ?? 'email',
});

export const toResendVerificationEmailInput = (
  dto: ResendVerificationEmailSchemaType,
  fingerprint?: RequestFingerprint,
): ResendVerificationEmailInput => ({
  email: dto.email,
  requesterIp: cleanValue(fingerprint?.ip),
  userAgent: cleanValue(pickHeaderValue(fingerprint?.userAgentHeader)),
});

export const toRequestPasswordResetInput = (
  dto: RequestPasswordResetSchemaType,
  fingerprint?: RequestFingerprint,
): RequestPasswordResetInput => ({
  email: dto.email,
  requesterIp: cleanValue(fingerprint?.ip),
  userAgent: cleanValue(pickHeaderValue(fingerprint?.userAgentHeader)),
});

export const toConfirmPasswordResetInput = (
  dto: ConfirmPasswordResetSchemaType,
): ConfirmPasswordResetInput => ({
  accessToken: dto.accessToken,
  newPassword: dto.newPassword,
  refreshToken: dto.refreshToken,
});
