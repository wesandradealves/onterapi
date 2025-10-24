import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  IPushNotificationService,
  PushNotificationPayload,
} from '../../../domain/integrations/interfaces/services/push-notification.service.interface';
import { Result, failure, success } from '../../../shared/types/result.type';

interface PushApiResponse {
  id?: string;
  status?: string;
  rejectedTokens?: string[];
  error?: string;
}

@Injectable()
export class PushNotificationService implements IPushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private readonly defaultBaseUrl = 'https://push-gateway.onterapi.com/v1';
  private readonly requestTimeoutMs = 8000;

  constructor(private readonly configService: ConfigService) {}

  async sendNotification(payload: PushNotificationPayload): Promise<Result<void>> {
    const tokens = Array.isArray(payload.tokens)
      ? payload.tokens.filter((token) => typeof token === 'string' && token.trim().length > 0)
      : [];

    if (tokens.length === 0) {
      this.logger.debug('Notificacao push ignorada: lista de tokens vazia ou invalida');
      return success(undefined);
    }

    const baseUrl =
      this.configService.get<string>('PUSH_API_BASE_URL') ?? this.defaultBaseUrl;
    const apiKey = this.configService.get<string>('PUSH_API_KEY');

    if (!apiKey || apiKey.trim().length === 0) {
      this.logger.warn('Notificacao push ignorada: chave de API nao configurada');
      return success(undefined);
    }

    const endpoint = `${baseUrl.replace(/\/$/, '')}/notifications`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          tokens,
          title: payload.title,
          body: payload.body,
          data: payload.data ?? {},
          category: payload.category ?? 'default',
          tenantId: payload.tenantId ?? null,
          clinicId: payload.clinicId ?? null,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => undefined);
        this.logger.error(
          `Falha ao enviar notificacao push (status ${response.status})`,
          undefined,
          {
            status: response.status,
            response: errorBody,
          },
        );
        return failure(new Error('Falha ao enviar notificacao push'));
      }

      const body = (await response
        .json()
        .catch(() => ({}))) as PushApiResponse | Record<string, unknown>;

      const rejectedTokens =
        body && typeof body === 'object' && 'rejectedTokens' in body && Array.isArray(body.rejectedTokens)
          ? (body.rejectedTokens as string[])
          : [];

      if (rejectedTokens.length > 0) {
        this.logger.warn('Alguns tokens foram rejeitados pelo provedor de push', {
          rejectedTokens,
        });
      }

      this.logger.debug('Notificacao push enviada com sucesso', {
        tokens: tokens.length,
        providerId: 'id' in body ? body.id : undefined,
      });

      return success(undefined);
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        this.logger.error('Timeout ao enviar notificacao push');
        return failure(new Error('Timeout ao enviar notificacao push'));
      }

      this.logger.error('Erro inesperado ao enviar notificacao push', error as Error);
      return failure(new Error('Erro inesperado ao enviar notificacao push'));
    } finally {
      clearTimeout(timeout);
    }
  }
}
