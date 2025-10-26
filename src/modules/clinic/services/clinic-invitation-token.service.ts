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
  private readonly secret: string;

  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {
    const configuredSecret = this.configService.get<string>('CLINIC_INVITATION_TOKEN_SECRET');

    if (!configuredSecret || configuredSecret.trim().length === 0) {
      this.logger.warn(
        'CLINIC_INVITATION_TOKEN_SECRET nao configurado. Utilizando segredo padrao apenas para desenvolvimento.',
      );
      this.secret = 'clinic-invitation-secret';
    } else {
      this.secret = configuredSecret.trim();
    }
  }

  generateToken(input: {
    invitationId: string;
    clinicId: string;
    tenantId: string;
    expiresAt: Date;
    professionalId?: string;
    targetEmail?: string;
  }): { token: string; hash: string } {
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

  private sign(content: string): string {
    return createHmac('sha256', this.secret).update(content).digest('base64url');
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
}
