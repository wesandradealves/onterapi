/**
 * Entidade de domínio TwoFactor
 * Representa configurações e códigos 2FA
 */
export class TwoFactor {
  id: string;
  userId: string;
  secret?: string;
  backupCodes?: string[];
  method: 'authenticator' | 'sms' | 'email';
  isEnabled: boolean;
  isVerified: boolean;
  phoneNumber?: string;
  email?: string;
  lastUsedAt?: Date;
  tempCode?: string;
  tempCodeExpiresAt?: Date;
  tempCodeAttempts: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<TwoFactor>) {
    Object.assign(this, partial);
    this.method = partial.method ?? 'authenticator';
    this.isEnabled = partial.isEnabled ?? false;
    this.isVerified = partial.isVerified ?? false;
    this.tempCodeAttempts = partial.tempCodeAttempts ?? 0;
    this.createdAt = partial.createdAt ?? new Date();
    this.updatedAt = partial.updatedAt ?? new Date();
  }

  isTempCodeValid(): boolean {
    if (!this.tempCode || !this.tempCodeExpiresAt) return false;
    return this.tempCodeExpiresAt > new Date();
  }

  hasRemainingAttempts(): boolean {
    const maxAttempts = 3;
    return this.tempCodeAttempts < maxAttempts;
  }

  incrementAttempts(): void {
    this.tempCodeAttempts++;
    this.updatedAt = new Date();
  }

  resetAttempts(): void {
    this.tempCodeAttempts = 0;
    this.tempCode = undefined;
    this.tempCodeExpiresAt = undefined;
    this.updatedAt = new Date();
  }

  generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    this.backupCodes = codes;
    return codes;
  }

  useBackupCode(code: string): boolean {
    if (!this.backupCodes) return false;
    
    const index = this.backupCodes.indexOf(code);
    if (index === -1) return false;
    
    this.backupCodes.splice(index, 1);
    this.lastUsedAt = new Date();
    this.updatedAt = new Date();
    
    return true;
  }
}