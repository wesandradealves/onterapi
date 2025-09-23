import { DomainEvent } from './domain-event.interface';
import { v4 as uuidv4 } from 'uuid';

export class DomainEvents {
  static USER_CREATED = 'user.created';
  static USER_UPDATED = 'user.updated';
  static USER_DELETED = 'user.deleted';
  static USER_LOGGED_IN = 'auth.user.logged_in';
  static USER_LOGGED_OUT = 'auth.user.logged_out';
  static USER_REGISTERED = 'auth.user.registered';
  static TOKEN_REFRESHED = 'auth.token.refreshed';
  static TWO_FA_SENT = 'auth.two_fa.sent';
  static TWO_FA_VALIDATED = 'auth.two_fa.validated';
  static TWO_FA_FAILED = 'auth.two_fa.failed';
  static PASSWORD_RESET_REQUESTED = 'auth.password.reset_requested';
  static EMAIL_VERIFIED = 'auth.email.verified';
  static PATIENT_CREATED = 'patient.created';
  static PATIENT_UPDATED = 'patient.updated';
  static PATIENT_TRANSFERRED = 'patient.transferred';
  static PATIENT_ARCHIVED = 'patient.archived';
  static PATIENT_RESTORED = 'patient.restored';

  static createEvent<T = any>(
    eventName: string,
    aggregateId: string,
    payload: T,
    metadata?: any,
  ): DomainEvent<T> {
    return {
      eventId: uuidv4(),
      eventName,
      aggregateId,
      occurredOn: new Date(),
      payload,
      metadata: {
        ...metadata,
        correlationId: metadata?.correlationId || uuidv4(),
      },
    };
  }

  static userCreated(userId: string, userData: any, metadata?: any): DomainEvent {
    return this.createEvent(this.USER_CREATED, userId, { userId, ...userData }, metadata);
  }

  static userUpdated(userId: string, changes: any, metadata?: any): DomainEvent {
    return this.createEvent(this.USER_UPDATED, userId, { userId, changes }, metadata);
  }

  static userDeleted(userId: string, metadata?: any): DomainEvent {
    return this.createEvent(this.USER_DELETED, userId, { userId, deletedAt: new Date() }, metadata);
  }

  static userLoggedIn(userId: string, sessionData: any, metadata?: any): DomainEvent {
    return this.createEvent(this.USER_LOGGED_IN, userId, { userId, ...sessionData }, metadata);
  }

  static userLoggedOut(userId: string, metadata?: any): DomainEvent {
    return this.createEvent(this.USER_LOGGED_OUT, userId, { userId, loggedOutAt: new Date() }, metadata);
  }

  static userRegistered(userId: string, userData: any, metadata?: any): DomainEvent {
    return this.createEvent(this.USER_REGISTERED, userId, { userId, ...userData }, metadata);
  }

  static tokenRefreshed(userId: string, tokenData: any, metadata?: any): DomainEvent {
    return this.createEvent(this.TOKEN_REFRESHED, userId, { userId, ...tokenData }, metadata);
  }

  static twoFaSent(userId: string, channel: string, metadata?: any): DomainEvent {
    return this.createEvent(this.TWO_FA_SENT, userId, { userId, channel, sentAt: new Date() }, metadata);
  }

  static twoFaValidated(userId: string, metadata?: any): DomainEvent {
    return this.createEvent(this.TWO_FA_VALIDATED, userId, { userId, validatedAt: new Date() }, metadata);
  }

  static twoFaFailed(userId: string, attemptData: any, metadata?: any): DomainEvent {
    return this.createEvent(
      this.TWO_FA_FAILED,
      userId,
      { userId, ...attemptData, failedAt: new Date() },
      metadata,
    );
  }

  static passwordResetRequested(userId: string, email: string, metadata?: any): DomainEvent {
    return this.createEvent(
      this.PASSWORD_RESET_REQUESTED,
      userId,
      { userId, email, requestedAt: new Date() },
      metadata,
    );
  }

  static emailVerified(userId: string, email: string, metadata?: any): DomainEvent {
    return this.createEvent(
      this.EMAIL_VERIFIED,
      userId,
      { userId, email, verifiedAt: new Date() },
      metadata,
    );
  }

  static patientCreated(patientId: string, patientData: any, metadata?: any): DomainEvent {
    return this.createEvent(this.PATIENT_CREATED, patientId, { patientId, ...patientData }, metadata);
  }

  static patientUpdated(patientId: string, changes: any, metadata?: any): DomainEvent {
    return this.createEvent(this.PATIENT_UPDATED, patientId, { patientId, changes }, metadata);
  }

  static patientTransferred(patientId: string, transferData: any, metadata?: any): DomainEvent {
    return this.createEvent(
      this.PATIENT_TRANSFERRED,
      patientId,
      { patientId, ...transferData },
      metadata,
    );
  }

  static patientArchived(patientId: string, archiveData?: any, metadata?: any): DomainEvent {
    return this.createEvent(
      this.PATIENT_ARCHIVED,
      patientId,
      { patientId, archivedAt: new Date(), ...archiveData },
      metadata,
    );
  }

  static patientRestored(patientId: string, metadata?: any): DomainEvent {
    return this.createEvent(
      this.PATIENT_RESTORED,
      patientId,
      { patientId, restoredAt: new Date() },
      metadata,
    );
  }
}
