import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DomainEvent } from '../../../shared/events/domain-event.interface';

@Injectable()
export class AuthEventsSubscriber {
  private readonly logger = new Logger(AuthEventsSubscriber.name);

  @OnEvent('auth.user.logged_in')
  async handleUserLoggedIn(event: DomainEvent) {
    this.logger.log(`User logged in: ${event.payload.email}`, {
      userId: event.aggregateId,
      sessionId: event.payload.sessionId,
      ip: event.payload.ip,
    });
  }

  @OnEvent('auth.user.logged_out')
  async handleUserLoggedOut(event: DomainEvent) {
    this.logger.log(`User logged out: ${event.aggregateId}`, {
      allDevices: event.payload.allDevices,
      revokedCount: event.payload.revokedCount,
    });
  }

  @OnEvent('auth.two_fa.sent')
  async handleTwoFaSent(event: DomainEvent) {
    this.logger.log(`2FA code sent to user ${event.aggregateId} via ${event.payload.channel}`);
  }

  @OnEvent('auth.two_fa.validated')
  async handleTwoFaValidated(event: DomainEvent) {
    this.logger.log(`2FA validated for user ${event.aggregateId}`);
  }

  @OnEvent('auth.token.refreshed')
  async handleTokenRefreshed(event: DomainEvent) {
    this.logger.log(`Token refreshed for user ${event.aggregateId}`, {
      sessionId: event.payload.sessionId,
    });
  }
}
