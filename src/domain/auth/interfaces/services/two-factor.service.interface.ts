import { Result } from '@shared/types/result.type';

/**
 * Interface para o serviço de autenticação de dois fatores
 */
export interface ITwoFactorService {
  /**
   * Gerar secret para TOTP
   */
  generateSecret(userId: string, email: string): TwoFactorSecret;

  /**
   * Verificar código TOTP
   */
  verifyTOTP(secret: string, code: string): boolean;

  /**
   * Gerar código temporário (SMS/Email)
   */
  generateTempCode(): string;

  /**
   * Gerar QR Code para apps autenticadores
   */
  generateQRCode(secret: string, email: string): Promise<string>;

  /**
   * Gerar backup codes
   */
  generateBackupCodes(count?: number): string[];

  /**
   * Validar backup code
   */
  validateBackupCode(codes: string[], code: string): boolean;
}

export interface TwoFactorSecret {
  secret: string;
  otpAuthUrl: string;
  manualEntryKey: string;
}

export const ITwoFactorService = Symbol('ITwoFactorService');