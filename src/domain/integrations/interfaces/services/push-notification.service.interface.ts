import { Result } from '../../../../shared/types/result.type';

export interface PushNotificationPayload {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string | number | boolean>;
  category?: string;
  tenantId?: string;
  clinicId?: string;
}

export interface IPushNotificationService {
  sendNotification(payload: PushNotificationPayload): Promise<Result<void>>;
}

export const IPushNotificationService = Symbol('IPushNotificationService');
