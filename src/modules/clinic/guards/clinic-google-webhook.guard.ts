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

const TOKEN_HEADERS = [
  'x-goog-channel-token',
  'x-google-webhook-token',
  'x-webhook-token',
  'authorization',
];

@Injectable()
export class ClinicGoogleWebhookGuard implements CanActivate {
  private readonly logger = new Logger(ClinicGoogleWebhookGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestLike>();
    const expectedToken = this.configService.get<string>('CLINIC_GOOGLE_WEBHOOK_TOKEN')?.trim();

    if (!expectedToken) {
      this.logger.error(
        'CLINIC_GOOGLE_WEBHOOK_TOKEN nao configurado; impossivel validar webhook do Google Calendar',
      );
      throw new UnauthorizedException('Webhook nao autorizado');
    }

    const providedToken = this.extractToken(request.headers);

    if (!providedToken || providedToken !== expectedToken) {
      this.logger.warn('Token invalido recebido no webhook do Google Calendar');
      throw new UnauthorizedException('Webhook nao autorizado');
    }

    return true;
  }

  private extractToken(headers: Record<string, string | string[] | undefined>): string | null {
    for (const header of TOKEN_HEADERS) {
      const value = headers[header];
      if (Array.isArray(value) && value.length > 0) {
        return this.normalize(value[0] ?? '');
      }
      if (typeof value === 'string') {
        return this.normalize(value);
      }
    }

    return null;
  }

  private normalize(value: string): string {
    const trimmed = value.trim();
    if (trimmed.toLowerCase().startsWith('bearer ')) {
      return trimmed.slice(7).trim();
    }

    return trimmed;
  }
}
