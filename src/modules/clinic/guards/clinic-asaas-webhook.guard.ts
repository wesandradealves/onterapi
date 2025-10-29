import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { verifyHmacSignature } from '../../../shared/utils/hmac.util';

interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
}

const DEFAULT_MAX_SKEW_MS = 5 * 60 * 1000; // 5 minutos
const SIGNATURE_HEADER_CANDIDATES = ['x-asaas-signature', 'x-hub-signature', 'x-webhook-signature'];
const TIMESTAMP_HEADER_CANDIDATES = ['x-asaas-timestamp', 'x-webhook-timestamp'];
const TOKEN_HEADER_CANDIDATES = ['x-asaas-token', 'x-webhook-token', 'authorization'];

@Injectable()
export class ClinicAsaasWebhookGuard implements CanActivate {
  private readonly logger = new Logger(ClinicAsaasWebhookGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestLike>();
    const secret = this.configService.get<string>('CLINIC_ASAAS_WEBHOOK_SECRET')?.trim();

    if (secret) {
      return this.validateHmac(request, secret);
    }

    const token = this.configService.get<string>('CLINIC_ASAAS_WEBHOOK_TOKEN')?.trim();

    if (!token) {
      this.logger.error(
        'Nenhum mecanismo de autenticacao configurado para o webhook ASAAS (defina CLINIC_ASAAS_WEBHOOK_SECRET ou CLINIC_ASAAS_WEBHOOK_TOKEN)',
      );
      throw new UnauthorizedException('Webhook nao autorizado');
    }

    const providedToken = this.extractHeader(request.headers, TOKEN_HEADER_CANDIDATES);

    if (!providedToken || this.normalizeToken(providedToken) !== token) {
      this.logger.warn('Tentativa de webhook ASAAS com token invalido');
      throw new UnauthorizedException('Webhook nao autorizado');
    }

    return true;
  }

  private validateHmac(request: RequestLike, secret: string): boolean {
    const timestampHeader = this.extractHeader(request.headers, TIMESTAMP_HEADER_CANDIDATES);
    const signatureHeader = this.extractHeader(request.headers, SIGNATURE_HEADER_CANDIDATES);

    if (!timestampHeader || !signatureHeader) {
      this.logger.warn('Webhook ASAAS sem timestamp ou assinatura HMAC.');
      throw new UnauthorizedException('Assinatura do webhook invalida');
    }

    const maxSkewMs = this.getMaxSkewMs();
    const verification = verifyHmacSignature({
      secret,
      timestampHeader,
      signatureHeader,
      body: request.body ?? {},
      maxSkewMs,
    });

    if (!verification.valid) {
      this.logger.warn(
        `Assinatura do webhook ASAAS rejeitada (${verification.reason ?? 'motivo desconhecido'})`,
      );
      throw new UnauthorizedException('Assinatura do webhook invalida');
    }

    return true;
  }

  private getMaxSkewMs(): number {
    const configured = this.configService.get<string | number | undefined>(
      'CLINIC_ASAAS_WEBHOOK_MAX_SKEW_MS',
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

  private normalizeToken(raw: string): string {
    const trimmed = raw.trim();

    if (trimmed.toLowerCase().startsWith('bearer ')) {
      return trimmed.slice(7).trim();
    }

    return trimmed;
  }
}
