import { Result } from '../../../../shared/types/result.type';

export interface WhatsAppMessagePayload {
  to: string;
  body: string;
}

export interface IWhatsAppService {
  sendMessage(payload: WhatsAppMessagePayload): Promise<Result<void>>;
}

export const IWhatsAppService = Symbol('IWhatsAppService');
