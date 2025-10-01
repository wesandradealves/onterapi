import { v4 as uuidv4 } from 'uuid';

import { DomainEvent, DomainEventMetadata } from './domain-event.interface';
import { AnamnesisAIRequestedEventPayload } from '../../domain/anamnesis/types/anamnesis.types';

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
  static EMAIL_VERIFICATION_RESENT = 'auth.email.resent';
  static PASSWORD_RESET_COMPLETED = 'auth.password.reset_completed';
  static PATIENT_CREATED = 'patient.created';
  static PATIENT_UPDATED = 'patient.updated';
  static PATIENT_TRANSFERRED = 'patient.transferred';
  static PATIENT_ARCHIVED = 'patient.archived';
  static PATIENT_RESTORED = 'patient.restored';
  static ANAMNESIS_CREATED = 'anamnesis.created';
  static ANAMNESIS_STEP_SAVED = 'anamnesis.step_saved';
  static ANAMNESIS_SUBMITTED = 'anamnesis.submitted';
  static ANAMNESIS_CANCELLED = 'anamnesis.cancelled';
  static ANAMNESIS_PLAN_GENERATED = 'anamnesis.plan.generated';
  static ANAMNESIS_PLAN_FEEDBACK_SAVED = 'anamnesis.plan.feedback_saved';
  static ANAMNESIS_AI_REQUESTED = 'anamnesis.ai.requested';
  static ANAMNESIS_AI_COMPLETED = 'anamnesis.ai.completed';
  static ANAMNESIS_ATTACHMENT_CREATED = 'anamnesis.attachment.created';
  static ANAMNESIS_ATTACHMENT_REMOVED = 'anamnesis.attachment.removed';

  static createEvent<
    TPayload = Record<string, unknown>,
    TMetadata extends DomainEventMetadata = DomainEventMetadata,
  >(
    eventName: string,
    aggregateId: string,
    payload: TPayload,
    metadata?: TMetadata,
  ): DomainEvent<TPayload, DomainEventMetadata & TMetadata> {
    const mergedMetadata = {
      ...(metadata ?? ({} as TMetadata)),
      correlationId: metadata?.correlationId ?? uuidv4(),
    } as DomainEventMetadata & TMetadata;

    return {
      eventId: uuidv4(),
      eventName,
      aggregateId,
      occurredOn: new Date(),
      payload,
      metadata: mergedMetadata,
    };
  }

  static userCreated(
    userId: string,
    userData: Record<string, unknown>,
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(this.USER_CREATED, userId, { userId, ...userData }, metadata);
  }

  static userUpdated(
    userId: string,
    changes: Record<string, unknown>,
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(this.USER_UPDATED, userId, { userId, changes }, metadata);
  }

  static userDeleted(userId: string, metadata?: DomainEventMetadata): DomainEvent {
    return this.createEvent(this.USER_DELETED, userId, { userId, deletedAt: new Date() }, metadata);
  }

  static userLoggedIn(
    userId: string,
    sessionData: Record<string, unknown>,
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(this.USER_LOGGED_IN, userId, { userId, ...sessionData }, metadata);
  }

  static userLoggedOut(userId: string, metadata?: DomainEventMetadata): DomainEvent {
    return this.createEvent(
      this.USER_LOGGED_OUT,
      userId,
      { userId, loggedOutAt: new Date() },
      metadata,
    );
  }

  static userRegistered(
    userId: string,
    userData: Record<string, unknown>,
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(this.USER_REGISTERED, userId, { userId, ...userData }, metadata);
  }

  static tokenRefreshed(
    userId: string,
    tokenData: Record<string, unknown>,
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(this.TOKEN_REFRESHED, userId, { userId, ...tokenData }, metadata);
  }

  static twoFaSent(userId: string, channel: string, metadata?: DomainEventMetadata): DomainEvent {
    return this.createEvent(
      this.TWO_FA_SENT,
      userId,
      { userId, channel, sentAt: new Date() },
      metadata,
    );
  }

  static twoFaValidated(userId: string, metadata?: DomainEventMetadata): DomainEvent {
    return this.createEvent(
      this.TWO_FA_VALIDATED,
      userId,
      { userId, validatedAt: new Date() },
      metadata,
    );
  }

  static twoFaFailed(
    userId: string,
    attemptData: Record<string, unknown>,
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.TWO_FA_FAILED,
      userId,
      { userId, ...attemptData, failedAt: new Date() },
      metadata,
    );
  }

  static passwordResetRequested(
    userId: string,
    email: string,
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.PASSWORD_RESET_REQUESTED,
      userId,
      { userId, email, requestedAt: new Date() },
      metadata,
    );
  }

  static emailVerified(userId: string, email: string, metadata?: DomainEventMetadata): DomainEvent {
    return this.createEvent(
      this.EMAIL_VERIFIED,
      userId,
      { userId, email, verifiedAt: new Date() },
      metadata,
    );
  }

  static emailVerificationResent(
    userId: string,
    email: string,
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.EMAIL_VERIFICATION_RESENT,
      userId,
      { userId, email, resentAt: new Date() },
      metadata,
    );
  }

  static passwordResetCompleted(
    userId: string,
    email: string,
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.PASSWORD_RESET_COMPLETED,
      userId,
      { userId, email, completedAt: new Date() },
      metadata,
    );
  }

  static patientCreated(
    patientId: string,
    patientData: Record<string, unknown>,
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.PATIENT_CREATED,
      patientId,
      { patientId, ...patientData },
      metadata,
    );
  }

  static patientUpdated(
    patientId: string,
    changes: Record<string, unknown>,
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(this.PATIENT_UPDATED, patientId, { patientId, changes }, metadata);
  }

  static patientTransferred(
    patientId: string,
    transferData: Record<string, unknown>,
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.PATIENT_TRANSFERRED,
      patientId,
      { patientId, ...transferData },
      metadata,
    );
  }

  static patientArchived(
    patientId: string,
    archiveData: Record<string, unknown> = {},
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.PATIENT_ARCHIVED,
      patientId,
      { patientId, archivedAt: new Date(), ...archiveData },
      metadata,
    );
  }

  static patientRestored(patientId: string, metadata?: DomainEventMetadata): DomainEvent {
    return this.createEvent(
      this.PATIENT_RESTORED,
      patientId,
      { patientId, restoredAt: new Date() },
      metadata,
    );
  }

  static anamnesisCreated(
    anamnesisId: string,
    anamnesisData: Record<string, unknown>,
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.ANAMNESIS_CREATED,
      anamnesisId,
      { anamnesisId, ...anamnesisData },
      metadata,
    );
  }

  static anamnesisStepSaved(
    anamnesisId: string,
    stepData: Record<string, unknown>,
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.ANAMNESIS_STEP_SAVED,
      anamnesisId,
      { anamnesisId, ...stepData },
      metadata,
    );
  }

  static anamnesisSubmitted(
    anamnesisId: string,
    submissionData: Record<string, unknown>,
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.ANAMNESIS_SUBMITTED,
      anamnesisId,
      { anamnesisId, ...submissionData },
      metadata,
    );
  }

  static anamnesisCancelled(
    anamnesisId: string,
    cancelData: { tenantId: string; reason?: string; cancelledBy: string },
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.ANAMNESIS_CANCELLED,
      anamnesisId,
      { anamnesisId, cancelledAt: new Date(), ...cancelData },
      metadata,
    );
  }

  static therapeuticPlanGenerated(
    anamnesisId: string,
    planData: Record<string, unknown>,
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.ANAMNESIS_PLAN_GENERATED,
      anamnesisId,
      { anamnesisId, ...planData },
      metadata,
    );
  }

  static therapeuticPlanFeedbackSaved(
    anamnesisId: string,
    feedbackData: Record<string, unknown>,
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.ANAMNESIS_PLAN_FEEDBACK_SAVED,
      anamnesisId,
      { anamnesisId, ...feedbackData },
      metadata,
    );
  }

  static anamnesisAIRequested(
    anamnesisId: string,
    requestData: Omit<AnamnesisAIRequestedEventPayload, 'anamnesisId'>,
    metadata?: DomainEventMetadata,
  ): DomainEvent<AnamnesisAIRequestedEventPayload> {
    return this.createEvent(
      this.ANAMNESIS_AI_REQUESTED,
      anamnesisId,
      { anamnesisId, ...requestData },
      metadata,
    );
  }

  static anamnesisAICompleted(
    anamnesisId: string,
    resultData: {
      tenantId: string;
      analysisId: string;
      status: string;
      respondedAt: Date;
      confidence?: number;
      clinicalReasoning?: string;
      summary?: string;
      planText?: string | null;
      reasoningText?: string | null;
      evidenceMap?: Array<Record<string, unknown>> | null;
      model?: string;
      promptVersion?: string;
      tokensInput?: number;
      tokensOutput?: number;
      latencyMs?: number;
      errorMessage?: string;
      payload?: unknown;
      rawResponse?: unknown;
    },
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.ANAMNESIS_AI_COMPLETED,
      anamnesisId,
      { anamnesisId, ...resultData },
      metadata,
    );
  }

  static anamnesisAttachmentCreated(
    anamnesisId: string,
    attachmentData: Record<string, unknown>,
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.ANAMNESIS_ATTACHMENT_CREATED,
      anamnesisId,
      { anamnesisId, ...attachmentData },
      metadata,
    );
  }

  static anamnesisAttachmentRemoved(
    anamnesisId: string,
    attachmentData: Record<string, unknown>,
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.ANAMNESIS_ATTACHMENT_REMOVED,
      anamnesisId,
      { anamnesisId, ...attachmentData },
      metadata,
    );
  }
}
