import { Result } from '@shared/types/result.type';

export interface ITwoFactorService {
  generateSecret(userId: string, email: string): TwoFactorSecret;

  verifyTOTP(secret: string, code: string): boolean;

  generateTempCode(): string;

  generateQRCode(secret: string, email: string): Promise<string>;

  generateBackupCodes(count?: number): string[];

  validateBackupCode(codes: string[], code: string): boolean;
}

export interface TwoFactorSecret {
  secret: string;
  otpAuthUrl: string;
  manualEntryKey: string;
}

export const ITwoFactorService = Symbol('ITwoFactorService');