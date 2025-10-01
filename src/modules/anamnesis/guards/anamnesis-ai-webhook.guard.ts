import { createHmac, timingSafeEqual } from 'node:crypto';

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

const DEFAULT_MAX_SKEW_MS = 5 * 60 * 1000; // 5 minutes
const SIGNATURE_HEADER_CANDIDATES = ['x-anamnesis-ai-signature', 'x-ai-signature'];
const TIMESTAMP_HEADER_CANDIDATES = ['x-anamnesis-ai-timestamp', 'x-ai-timestamp'];

@Injectable()
export class AnamnesisAIWebhookGuard implements CanActivate {
  private readonly logger = new Logger(AnamnesisAIWebhookGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestLike>();
    const secret = this.configService.get<string>('ANAMNESIS_AI_WEBHOOK_SECRET');

    if (!secret) {
      this.logger.error('Segredo do webhook da IA nao configurado (ANAMNESIS_AI_WEBHOOK_SECRET)');
      throw new UnauthorizedException('Webhook nao autorizado');
    }

    const timestampHeader = this.extractHeader(request.headers, TIMESTAMP_HEADER_CANDIDATES);
    const signatureHeader = this.extractHeader(request.headers, SIGNATURE_HEADER_CANDIDATES);

    if (!timestampHeader || !signatureHeader) {
      this.logger.warn('Webhook IA sem timestamp ou assinatura.');
      throw new UnauthorizedException('Assinatura do webhook invalida');
    }

    const timestamp = Number(timestampHeader);
    if (!Number.isFinite(timestamp)) {
      this.logger.warn('Timestamp do webhook IA invalido.');
      throw new UnauthorizedException('Assinatura do webhook invalida');
    }

    if (this.isTimestampExpired(timestamp)) {
      this.logger.warn('Timestamp do webhook IA fora da janela permitida.');
      throw new UnauthorizedException('Assinatura do webhook expirada');
    }

    const payload = this.buildPayload(timestampHeader, request.body);
    const expectedSignature = this.computeSignature(secret, payload);
    const providedSignature = this.normalizeSignature(signatureHeader);

    if (!this.verifySignature(providedSignature, expectedSignature)) {
      this.logger.warn('Webhook IA com assinatura invalida.');
      throw new UnauthorizedException('Assinatura do webhook invalida');
    }

    return true;
  }

  private buildPayload(timestamp: string, body: unknown): string {
    const serializedBody = this.safeStringify(body);
    return `${timestamp}.${serializedBody}`;
  }

  private computeSignature(secret: string, payload: string): string {
    return createHmac('sha256', secret).update(payload).digest('hex');
  }

  private normalizeSignature(signatureHeader: string): string {
    const normalized = signatureHeader.startsWith('sha256=')
      ? signatureHeader.slice('sha256='.length)
      : signatureHeader;

    if (!/^[0-9a-fA-F]+$/.test(normalized)) {
      return '';
    }

    return normalized.toLowerCase();
  }

  private verifySignature(provided: string, expected: string): boolean {
    if (!provided || provided.length !== expected.length) {
      return false;
    }

    try {
      const providedBuffer = Buffer.from(provided, 'hex');
      const expectedBuffer = Buffer.from(expected, 'hex');

      if (providedBuffer.length !== expectedBuffer.length) {
        return false;
      }

      return timingSafeEqual(providedBuffer, expectedBuffer);
    } catch (error) {
      this.logger.debug('Falha ao comparar assinatura do webhook IA', error as Error);
      return false;
    }
  }

  private isTimestampExpired(timestamp: number): boolean {
    const maxSkewMs = this.getMaxSkewMs();
    const delta = Math.abs(Date.now() - timestamp);
    return delta > maxSkewMs;
  }

  private getMaxSkewMs(): number {
    const configured = this.configService.get<string | number | undefined>(
      'ANAMNESIS_AI_WEBHOOK_MAX_SKEW_MS',
    );

    if (typeof configured === 'number' && Number.isFinite(configured) && configured > 0) {
      return configured;
    }

    if (typeof configured === 'string') {
      const parsed = Number(configured);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }

    return DEFAULT_MAX_SKEW_MS;
  }

  private safeStringify(body: unknown): string {
    if (body === undefined || body === null) {
      return '{}';
    }

    if (typeof body === 'string') {
      return body;
    }

    try {
      return JSON.stringify(body);
    } catch (error) {
      this.logger.warn('Nao foi possivel serializar corpo do webhook IA para assinatura.');
      throw new UnauthorizedException('Assinatura do webhook invalida');
    }
  }

  private extractHeader(
    headers: Record<string, string | string[] | undefined>,
    keys: string[],
  ): string | undefined {
    for (const key of keys) {
      const value = headers[key];
      if (Array.isArray(value)) {
        if (value.length > 0 && typeof value[0] === 'string') {
          return value[0];
        }
      } else if (typeof value === 'string') {
        return value;
      }
    }
    return undefined;
  }
}
