export interface DomainEvent<T = any> {
  eventId: string;
  eventName: string;
  aggregateId: string;
  occurredOn: Date;
  payload: T;
  metadata?: {
    userId?: string;
    tenantId?: string;
    correlationId?: string;
    causationId?: string;
    [key: string]: any;
  };
}