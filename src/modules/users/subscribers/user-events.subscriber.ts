import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DomainEvent } from '../../../shared/events/domain-event.interface';

@Injectable()
export class UserEventsSubscriber {
  private readonly logger = new Logger(UserEventsSubscriber.name);

  @OnEvent('user.created')
  async handleUserCreated(event: DomainEvent) {
    this.logger.log(`New user created: ${event.payload.email}`, {
      userId: event.aggregateId,
      name: event.payload.name,
      role: event.payload.role,
      tenantId: event.payload.tenantId,
    });
  }

  @OnEvent('user.updated')
  async handleUserUpdated(event: DomainEvent) {
    this.logger.log(`User updated: ${event.aggregateId}`, {
      changes: event.payload.changes,
      updatedBy: event.metadata?.userId,
    });
  }

  @OnEvent('user.deleted')
  async handleUserDeleted(event: DomainEvent) {
    this.logger.log(`User deleted: ${event.aggregateId}`, {
      deletedBy: event.metadata?.deletedBy,
      deletedAt: event.payload.deletedAt,
    });
  }
}
