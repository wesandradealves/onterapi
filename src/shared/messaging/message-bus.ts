import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export enum DomainEvents {
  // Patient Events
  PATIENT_CREATED = 'patient.created',
  PATIENT_UPDATED = 'patient.updated',
  PATIENT_DELETED = 'patient.deleted',
  PATIENT_TRANSFERRED = 'patient.transferred',
  
  // Appointment Events
  APPOINTMENT_SCHEDULED = 'appointment.scheduled',
  APPOINTMENT_CONFIRMED = 'appointment.confirmed',
  APPOINTMENT_CANCELLED = 'appointment.cancelled',
  APPOINTMENT_RESCHEDULED = 'appointment.rescheduled',
  APPOINTMENT_COMPLETED = 'appointment.completed',
  
  // Consultation Events
  CONSULTATION_STARTED = 'consultation.started',
  CONSULTATION_COMPLETED = 'consultation.completed',
  CONSULTATION_NOTES_UPDATED = 'consultation.notes.updated',
  
  // Anamnesis Events
  ANAMNESIS_STARTED = 'anamnesis.started',
  ANAMNESIS_COMPLETED = 'anamnesis.completed',
  ANAMNESIS_ANALYZED = 'anamnesis.analyzed',
  
  // Therapeutic Plan Events
  THERAPEUTIC_PLAN_CREATED = 'therapeutic.plan.created',
  THERAPEUTIC_PLAN_UPDATED = 'therapeutic.plan.updated',
  THERAPEUTIC_PLAN_APPROVED = 'therapeutic.plan.approved',
  THERAPEUTIC_PLAN_AI_GENERATED = 'therapeutic.plan.ai.generated',
  
  // Payment Events
  PAYMENT_PROCESSED = 'payment.processed',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_REFUNDED = 'payment.refunded',
  PAYMENT_SPLIT_COMPLETED = 'payment.split.completed',
  
  // User Events
  USER_REGISTERED = 'user.registered',
  USER_ACTIVATED = 'user.activated',
  USER_DEACTIVATED = 'user.deactivated',
  USER_PASSWORD_CHANGED = 'user.password.changed',
  
  // Clinic Events
  CLINIC_CREATED = 'clinic.created',
  CLINIC_UPDATED = 'clinic.updated',
  CLINIC_SUBSCRIPTION_CHANGED = 'clinic.subscription.changed',
  
  // AI Events
  AI_ANALYSIS_REQUESTED = 'ai.analysis.requested',
  AI_ANALYSIS_COMPLETED = 'ai.analysis.completed',
  AI_FEEDBACK_RECEIVED = 'ai.feedback.received',
  
  // Notification Events
  NOTIFICATION_SENT = 'notification.sent',
  NOTIFICATION_FAILED = 'notification.failed',
  WHATSAPP_MESSAGE_SENT = 'whatsapp.message.sent',
  EMAIL_SENT = 'email.sent',
}

export interface EventPayload<T = any> {
  eventId: string;
  timestamp: Date;
  tenantId?: string;
  userId?: string;
  data: T;
  metadata?: Record<string, any>;
}

@Injectable()
export class MessageBus {
  private static instance: MessageBus;
  private readonly logger = new Logger(MessageBus.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Singleton pattern implementation
   */
  static getInstance(eventEmitter?: EventEmitter2): MessageBus {
    if (!MessageBus.instance) {
      if (!eventEmitter) {
        throw new Error('EventEmitter must be provided for first initialization');
      }
      MessageBus.instance = new MessageBus(eventEmitter);
    }
    return MessageBus.instance;
  }

  /**
   * Publish an event to the message bus
   */
  async publish<T = any>(
    event: DomainEvents,
    payload: T,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const eventPayload: EventPayload<T> = {
      eventId: this.generateEventId(),
      timestamp: new Date(),
      data: payload,
      metadata,
    };

    this.logger.log(`Publishing event: ${event}`, {
      eventId: eventPayload.eventId,
      event,
    });

    try {
      await this.eventEmitter.emitAsync(event, eventPayload);
      this.logEvent(event, eventPayload);
    } catch (error) {
      this.logger.error(`Failed to publish event: ${event}`, error);
      throw error;
    }
  }

  /**
   * Subscribe to an event
   */
  subscribe<T = any>(
    event: DomainEvents,
    handler: (payload: EventPayload<T>) => void | Promise<void>,
  ): void {
    this.logger.log(`Subscribing to event: ${event}`);
    this.eventEmitter.on(event, handler);
  }

  /**
   * Subscribe to an event (once only)
   */
  subscribeOnce<T = any>(
    event: DomainEvents,
    handler: (payload: EventPayload<T>) => void | Promise<void>,
  ): void {
    this.logger.log(`Subscribing once to event: ${event}`);
    this.eventEmitter.once(event, handler);
  }

  /**
   * Unsubscribe from an event
   */
  unsubscribe(
    event: DomainEvents,
    handler: (payload: EventPayload<any>) => void | Promise<void>,
  ): void {
    this.logger.log(`Unsubscribing from event: ${event}`);
    this.eventEmitter.off(event, handler);
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event?: DomainEvents): void {
    if (event) {
      this.logger.log(`Removing all listeners for event: ${event}`);
      this.eventEmitter.removeAllListeners(event);
    } else {
      this.logger.log('Removing all listeners for all events');
      this.eventEmitter.removeAllListeners();
    }
  }

  /**
   * Get listener count for an event
   */
  getListenerCount(event: DomainEvents): number {
    return this.eventEmitter.listenerCount(event);
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log event for audit trail
   */
  private logEvent(event: DomainEvents, payload: EventPayload): void {
    // TODO: Implement audit logging to database
    this.logger.debug(`Event logged: ${event}`, {
      eventId: payload.eventId,
      timestamp: payload.timestamp,
    });
  }
}