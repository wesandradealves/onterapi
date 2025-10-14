export type NotificationEventStatus = 'queued' | 'processed' | 'failed';

export interface NotificationEvent {
  id: string;
  eventName: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  recipients: string[];
  channels: string[];
  status: NotificationEventStatus;
  queuedAt: Date;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNotificationEventInput {
  eventName: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  recipients: string[];
  channels: string[];
  queuedAt: Date;
  status?: NotificationEventStatus;
}

export interface UpdateNotificationEventStatusInput {
  id: string;
  status: NotificationEventStatus;
  processedAt?: Date;
  errorDetail?: Record<string, unknown> | null;
}
