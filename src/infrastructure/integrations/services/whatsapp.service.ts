import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  IWhatsAppService,
  WhatsAppMessagePayload,
} from '../../../domain/integrations/interfaces/services/whatsapp.service.interface';
import { Result } from '../../../shared/types/result.type';

@Injectable()
export class WhatsAppService implements IWhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly baseUrl?: string;
  private readonly token?: string;
  private readonly senderId?: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.normalizeUrl(this.configService.get<string>('WHATSAPP_API_BASE_URL'));
    this.token = this.configService.get<string>('WHATSAPP_API_TOKEN');
    this.senderId = this.configService.get<string>('WHATSAPP_SENDER');
  }

  async sendMessage(payload: WhatsAppMessagePayload): Promise<Result<void>> {
    if (!this.baseUrl || !this.token) {
      this.logger.warn('WhatsApp integration not configured. Skipping message dispatch.', {
        hasBaseUrl: Boolean(this.baseUrl),
        hasToken: Boolean(this.token),
      });
      return { data: undefined };
    }

    if (!payload.to || payload.to.trim().length === 0) {
      this.logger.warn('WhatsApp message skipped: recipient number is empty.');
      return { data: undefined };
    }

    try {
      const endpoint = `${this.baseUrl}/messages`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: payload.to,
          from: this.senderId ?? undefined,
          message: payload.body,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(
          `Failed to send WhatsApp message. Status: ${response.status}. Body: ${errorText}`,
        );
        this.logger.error(error.message);
        return { error };
      }

      this.logger.debug('WhatsApp message dispatched', { to: payload.to });
      return { data: undefined };
    } catch (error) {
      this.logger.error('Unexpected error while sending WhatsApp message', error as Error, {
        to: payload.to,
      });
      return { error: error as Error };
    }
  }

  private normalizeUrl(url?: string | null): string | undefined {
    if (!url) {
      return undefined;
    }

    return url.endsWith('/') ? url.slice(0, -1) : url;
  }
}
