import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { ITwoFactorService, TwoFactorSecret } from '../../../domain/auth/interfaces/services/two-factor.service.interface';

@Injectable()
export class TwoFactorService implements ITwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);
  private readonly appName: string;

  constructor(private readonly configService: ConfigService) {
    this.appName = this.configService.get<string>('APP_NAME', 'OnTerapi');
  }

  generateSecret(userId: string, email: string): TwoFactorSecret {
    const secret = speakeasy.generateSecret({
      name: `${this.appName} (${email})`,
      issuer: this.appName,
      length: 32,
    });

    return {
      secret: secret.base32,
      otpAuthUrl: secret.otpauth_url!,
      manualEntryKey: secret.base32,
    };
  }

  verifyTOTP(secret: string, code: string): boolean {
    try {
      return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: code,
        window: 2,
      });
    } catch (error) {
      this.logger.error('Error verifying TOTP', error);
      return false;
    }
  }

  generateTempCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async generateQRCode(secret: string, email: string): Promise<string> {
    try {
      const otpAuthUrl = speakeasy.otpauthURL({
        secret,
        label: `${this.appName} (${email})`,
        issuer: this.appName,
        encoding: 'base32',
      });

      const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);
      return qrCodeDataUrl;
    } catch (error) {
      this.logger.error('Error generating QR code', error);
      throw error;
    }
  }

  generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const code = Math.random()
        .toString(36)
        .substring(2, 10)
        .toUpperCase();
      codes.push(code);
    }

    return codes;
  }

  validateBackupCode(codes: string[], code: string): boolean {
    const normalizedCode = code.toUpperCase().replace(/\s/g, '');
    return codes.some(c => c === normalizedCode);
  }
}