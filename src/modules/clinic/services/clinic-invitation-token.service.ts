import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, randomBytes } from 'crypto';

import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';
import { secureCompare } from '../utils/clinic-validation.util';

interface InvitationTokenPayload {
  inv: string;
  cli: string;
  ten: string;
  exp: string;
  iat: string;
  jti: string;
  pro?: string;
  eml?: string;
}

@Injectable()
export class ClinicInvitationTokenService {
  private readonly logger = new Logger(ClinicInvitationTokenService.name);
  private secret: string | null;
  private readonly maxAttempts: number;
  private readonly windowMs: number;
  private readonly blockDurationMs: number;
  private readonly verificationAttempts = new Map<
    string,
    { attempts: number; windowExpiresAt: number; blockedUntil?: number }
  >();

  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {
    const configuredSecret = this.configService.get<string>('CLINIC_INVITATION_TOKEN_SECRET');
    const trimmedSecret = configuredSecret?.trim();

    if (trimmedSecret && trimmedSecret.length > 0) {
      this.secret = trimmedSecret;
    } else {
      this.secret = null;
      this.logger.error(
        'CLINIC_INVITATION_TOKEN_SECRET nao configurado. Convites permanecerao bloqueados ate que o segredo seja definido.',
      );
    }

    this.maxAttempts = this.resolveNumber('CLINIC_INVITATION_TOKEN_MAX_ATTEMPTS', 5, 1, 100);
    this.windowMs = this.resolveNumber(
      'CLINIC_INVITATION_TOKEN_WINDOW_MS',
      10 * 60_000,
      5_000,
      24 * 60 * 60 * 1000,
    );
    this.blockDurationMs = this.resolveNumber(
      'CLINIC_INVITATION_TOKEN_BLOCK_MS',
      30 * 60_000,
      10_000,
      48 * 60 * 60 * 1000,
    );
  }

  generateToken(input: {
    invitationId: string;
    clinicId: string;
    tenantId: string;
    expiresAt: Date;
    professionalId?: string;
    targetEmail?: string;
  }): { token: string; hash: string } {
    this.ensureSecret();

    const issuedAt = new Date();
    const payload: InvitationTokenPayload = {
      inv: input.invitationId,
      cli: input.clinicId,
      ten: input.tenantId,
      exp: input.expiresAt.toISOString(),
      iat: issuedAt.toISOString(),
      jti: randomBytes(16).toString('hex'),
    };

    if (input.professionalId) {
      payload.pro = input.professionalId;
    }

    if (input.targetEmail) {
      payload.eml = input.targetEmail;
    }

    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
    const signature = this.sign(encodedPayload);
    const token = `${encodedPayload}.${signature}`;

    return {
      token,
      hash: this.hash(token),
    };
  }

  verifyToken(token: string): {
    invitationId: string;
    clinicId: string;
    tenantId: string;
    expiresAt: Date;
    issuedAt: Date;
    nonce: string;
    hash: string;
    professionalId?: string;
    targetEmail?: string;
  } {
    this.ensureSecret();
    this.applyRateLimiting(token);

    const [payloadPart, signature] = token.split('.');

    if (!payloadPart || !signature) {
      throw ClinicErrorFactory.invitationInvalidToken('Token de convite invalido');
    }

    const expectedSignature = this.sign(payloadPart);
    if (!secureCompare(expectedSignature, signature)) {
      throw ClinicErrorFactory.invitationInvalidToken('Assinatura do token de convite invalida');
    }

    const decoded = this.base64UrlDecode(payloadPart);

    let payload: InvitationTokenPayload;
    try {
      payload = JSON.parse(decoded) as InvitationTokenPayload;
    } catch (error) {
      throw ClinicErrorFactory.invitationInvalidToken('Payload do token de convite invalido');
    }

    const expiresAt = new Date(payload.exp);
    if (Number.isNaN(expiresAt.getTime())) {
      throw ClinicErrorFactory.invitationInvalidToken('Token de convite sem expiracao valida');
    }

    if (expiresAt.getTime() <= Date.now()) {
      throw ClinicErrorFactory.invitationExpired('Token de convite expirado');
    }

    const issuedAt = new Date(payload.iat);
    if (Number.isNaN(issuedAt.getTime())) {
      throw ClinicErrorFactory.invitationInvalidToken('Token de convite sem emissao valida');
    }

    return {
      invitationId: payload.inv,
      clinicId: payload.cli,
      tenantId: payload.ten,
      expiresAt,
      issuedAt,
      nonce: payload.jti,
      hash: this.hash(token),
      professionalId: payload.pro,
      targetEmail: payload.eml,
    };
  }

  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  assertSecretConfigured(): void {
    this.ensureSecret();
  }

  private sign(content: string): string {
    const secret = this.ensureSecret();
    return createHmac('sha256', secret).update(content).digest('base64url');
  }

  private base64UrlEncode(value: string): string {
    return Buffer.from(value, 'utf8')
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }

  private base64UrlDecode(value: string): string {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padLength = 4 - (normalized.length % 4 || 4);
    const padded = normalized + '='.repeat(padLength % 4);
    return Buffer.from(padded, 'base64').toString('utf8');
  }

  private ensureSecret(): string {
    if (!this.secret) {
      throw ClinicErrorFactory.invitationTokenSecretMissing(
        'Segredo do token de convite nao configurado. Operacao bloqueada.',
      );
    }

    return this.secret;
  }

  private applyRateLimiting(rawToken: string): void {
    const key = this.hash(rawToken);
    const now = Date.now();
    const existing = this.verificationAttempts.get(key);

    if (existing?.blockedUntil && existing.blockedUntil > now) {
      throw ClinicErrorFactory.invitationTokenRateLimited(
        'Numero de tentativas excedido para o token informado. Aguarde para tentar novamente.',
      );
    }

    let state = existing;
    if (!state || state.windowExpiresAt <= now) {
      state = { attempts: 0, windowExpiresAt: now + this.windowMs };
    }

    state.attempts += 1;

    if (state.attempts > this.maxAttempts) {
      state.blockedUntil = now + this.blockDurationMs;
      this.verificationAttempts.set(key, state);
      throw ClinicErrorFactory.invitationTokenRateLimited(
        'Seguranca ativada devido a excesso de verificacoes do token.',
      );
    }

    this.verificationAttempts.set(key, state);
  }

  private resolveNumber(
    key: string,
    defaultValue: number,
    minValue: number,
    maxValue: number,
  ): number {
    const raw = this.configService.get<number | string | undefined>(key);

    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return this.normalizeNumber(raw, defaultValue, minValue, maxValue);
    }

    if (typeof raw === 'string') {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        return this.normalizeNumber(parsed, defaultValue, minValue, maxValue);
      }
    }

    return defaultValue;
  }

  private normalizeNumber(
    value: number,
    defaultValue: number,
    minValue: number,
    maxValue: number,
  ): number {
    if (!Number.isFinite(value)) {
      return defaultValue;
    }

    if (value < minValue) {
      return minValue;
    }

    if (value > maxValue) {
      return maxValue;
    }

    return Math.floor(value);
  }
}
