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
}

@Injectable()
export class AnamnesisAIWebhookGuard implements CanActivate {
  private readonly logger = new Logger(AnamnesisAIWebhookGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestLike>();
    const configuredSecret = this.configService.get<string>('ANAMNESIS_AI_WEBHOOK_SECRET');

    if (!configuredSecret) {
      this.logger.error('Segredo do webhook da IA nao configurado (ANAMNESIS_AI_WEBHOOK_SECRET)');
      throw new UnauthorizedException('Webhook nao autorizado');
    }

    const providedSecret = this.extractHeader(request.headers, [
      'x-ai-secret',
      'x-anamnesis-ai-secret',
      'x-crew-ai-secret',
    ]);

    if (!providedSecret || providedSecret !== configuredSecret) {
      this.logger.warn('Tentativa de webhook com assinatura invalida');
      throw new UnauthorizedException('Assinatura do webhook invalida');
    }

    return true;
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
