import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export enum DomainEvents {
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  USER_EMAIL_VERIFIED = 'user.email.verified',
  
  AUTH_LOGIN_SUCCESS = 'auth.login.success',
  AUTH_LOGIN_FAILED = 'auth.login.failed',
  AUTH_LOGOUT = 'auth.logout',
  AUTH_LOGOUT_ALL_DEVICES = 'auth.logout.all',
  AUTH_TOKEN_REFRESHED = 'auth.token.refreshed',
  AUTH_2FA_SENT = 'auth.2fa.sent',
  AUTH_2FA_VALIDATED = 'auth.2fa.validated',
  AUTH_2FA_FAILED = 'auth.2fa.failed',
  AUTH_PASSWORD_RESET_REQUESTED = 'auth.password.reset.requested',
  AUTH_PASSWORD_RESET_COMPLETED = 'auth.password.reset.completed',
  
  EMAIL_SENT = 'email.sent',
  EMAIL_FAILED = 'email.failed',
  
  SYSTEM_ERROR = 'system.error',
  SYSTEM_WARNING = 'system.warning',
}

export interface DomainEvent<T = any> {
  eventName: DomainEvents;
  payload: T;
  timestamp: Date;
  userId?: string;
  tenantId?: string;
  correlationId?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);
  
  constructor(private readonly eventEmitter: EventEmitter2) {}
  
  emit<T = any>(eventName: DomainEvents, payload: T, metadata?: Partial<DomainEvent<T>>): void {
    const event: DomainEvent<T> = {
      eventName,
      payload,
      timestamp: new Date(),
      ...metadata,
    };
    
    this.logger.log(`Emitting event: ${eventName}`, { payload, metadata });
    this.eventEmitter.emit(eventName, event);
  }
  
  async emitAsync<T = any>(eventName: DomainEvents, payload: T, metadata?: Partial<DomainEvent<T>>): Promise<void> {
    const event: DomainEvent<T> = {
      eventName,
      payload,
      timestamp: new Date(),
      ...metadata,
    };
    
    this.logger.log(`Emitting async event: ${eventName}`, { payload, metadata });
    await this.eventEmitter.emitAsync(eventName, event);
  }
  
  on(eventName: DomainEvents, handler: (event: DomainEvent) => void): void {
    this.eventEmitter.on(eventName, handler);
  }
  
  once(eventName: DomainEvents, handler: (event: DomainEvent) => void): void {
    this.eventEmitter.once(eventName, handler);
  }
  
  removeListener(eventName: DomainEvents, handler: (event: DomainEvent) => void): void {
    this.eventEmitter.removeListener(eventName, handler);
  }
  
  removeAllListeners(eventName?: DomainEvents): void {
    if (eventName) {
      this.eventEmitter.removeAllListeners(eventName);
    } else {
      this.eventEmitter.removeAllListeners();
    }
  }
}