import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { normalizeSignature, verifyHmacSignature } from '../../../shared/utils/hmac.util';
import { AnamnesisAIWebhookReplayService } from '../services/anamnesis-ai-webhook-replay.service';

interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

const DEFAULT_MAX_SKEW_MS = 5 * 60 * 1000; // 5 minutos
const TIMESTAMP_HEADER_CANDIDATES = ['x-anamnesis-ai-timestamp', 'x-ai-timestamp'];
const SIGNATURE_HEADER_CANDIDATES = ['x-anamnesis-ai-signature', 'x-ai-signature'];
const TENANT_HEADER_CANDIDATES = ['x-tenant-id', 'x-tenant'];

@Injectable()
export class AnamnesisAIWebhookGuard implements CanActivate {
  private readonly logger = new Logger(AnamnesisAIWebhookGuard.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly replayService: AnamnesisAIWebhookReplayService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestLike>();
    const configuredSecret = this.configService.get<string>('ANAMNESIS_AI_WEBHOOK_SECRET');

    if (!configuredSecret) {
      this.logger.error('Segredo do webhook da IA nao configurado (ANAMNESIS_AI_WEBHOOK_SECRET)');
      throw new UnauthorizedException('Webhook nao autorizado');
    }

    const timestampHeader = this.extractHeader(request.headers, TIMESTAMP_HEADER_CANDIDATES);
    const signatureHeader = this.extractHeader(request.headers, SIGNATURE_HEADER_CANDIDATES);
    if (!timestampHeader || !signatureHeader) {
      this.logger.warn('Webhook IA sem timestamp ou assinatura.');
      throw new UnauthorizedException('Assinatura do webhook invalida');
    }

    const maxSkewMs = this.getMaxSkewMs();
    const verification = verifyHmacSignature({
      secret: configuredSecret,
      timestampHeader,
      signatureHeader,
      body: request.body ?? {},
      maxSkewMs,
    });

    if (!verification.valid) {
      this.logger.warn(
        `Assinatura do webhook invalida (${verification.reason ?? 'motivo desconhecido'})`,
      );
      throw new UnauthorizedException('Assinatura do webhook invalida');
    }

    const timestamp = Number(timestampHeader);
    const signature = normalizeSignature(signatureHeader);
    const tenant = this.extractHeader(request.headers, TENANT_HEADER_CANDIDATES);

    const payloadTimestamp = new Date(timestamp);
    if (Number.isNaN(payloadTimestamp.getTime())) {
      this.logger.warn('Timestamp do webhook invalido.');
      throw new UnauthorizedException('Assinatura do webhook invalida');
    }

    const analysisId = this.extractAnalysisId(request.body);
    const recorded = await this.replayService.registerRequest({
      tenantId: tenant ?? null,
      analysisId: analysisId ?? null,
      signature,
      payloadTimestamp,
      receivedAt: new Date(),
    });

    if (!recorded) {
      this.logger.warn('Tentativa de replay detectada para o webhook de IA.', {
        tenantId: tenant,
        analysisId,
      });
      throw new UnauthorizedException('Assinatura do webhook ja utilizada.');
    }

    return true;
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

  private extractAnalysisId(body: unknown): string | undefined {
    if (!body || typeof body !== 'object') {
      return undefined;
    }

    const candidate =
      (body as Record<string, unknown>)['analysisId'] ??
      (body as Record<string, unknown>)['analysis_id'];

    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate;
    }

    return undefined;
  }
}
