export interface DomainEventMetadata {
  userId?: string;
  tenantId?: string;
  correlationId?: string;
  causationId?: string;
  [key: string]: unknown;
}

export interface DomainEvent<
  TPayload = Record<string, unknown>,
  TMetadata extends DomainEventMetadata = DomainEventMetadata,
> {
  eventId: string;
  eventName: string;
  aggregateId: string;
  occurredOn: Date;
  payload: TPayload;
  metadata?: TMetadata;
}
