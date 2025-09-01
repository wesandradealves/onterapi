/**
 * Entidade de domínio UserSession
 * Representa uma sessão ativa de usuário
 */
export class UserSession {
  id: string;
  userId: string;
  refreshToken: string;
  accessToken?: string;
  deviceInfo?: {
    userAgent?: string;
    ip?: string;
    device?: string;
    browser?: string;
    os?: string;
  };
  ipAddress?: string;
  isTrustedDevice: boolean;
  lastActivityAt: Date;
  expiresAt: Date;
  createdAt: Date;
  revokedAt?: Date;
  revokedReason?: string;

  constructor(partial: Partial<UserSession>) {
    Object.assign(this, partial);
    this.isTrustedDevice = partial.isTrustedDevice ?? false;
    this.lastActivityAt = partial.lastActivityAt ?? new Date();
    this.createdAt = partial.createdAt ?? new Date();
  }

  isExpired(): boolean {
    return this.expiresAt < new Date();
  }

  isRevoked(): boolean {
    return !!this.revokedAt;
  }

  isValid(): boolean {
    return !this.isExpired() && !this.isRevoked();
  }

  shouldRefresh(): boolean {
    const now = new Date();
    const timeToExpiry = this.expiresAt.getTime() - now.getTime();
    const fiveMinutes = 5 * 60 * 1000;
    
    return timeToExpiry < fiveMinutes && !this.isExpired();
  }

  updateActivity(): void {
    this.lastActivityAt = new Date();
  }

  revoke(reason?: string): void {
    this.revokedAt = new Date();
    this.revokedReason = reason;
  }
}