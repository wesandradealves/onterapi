import { v4 as uuidv4 } from 'uuid';

import { DomainEvent, DomainEventMetadata } from './domain-event.interface';
import { AnamnesisAIRequestedEventPayload } from '../../domain/anamnesis/types/anamnesis.types';
import {
  ClinicCurrency,
  ClinicPaymentSplitAllocation,
} from '../../domain/clinic/types/clinic.types';

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
  static SCHEDULING_HOLD_CREATED = 'scheduling.hold.created';
  static SCHEDULING_HOLD_EXPIRED = 'scheduling.hold.expired';
  static SCHEDULING_BOOKING_CREATED = 'scheduling.booking.created';
  static SCHEDULING_BOOKING_CONFIRMED = 'scheduling.booking.confirmed';
  static SCHEDULING_BOOKING_RESCHEDULED = 'scheduling.booking.rescheduled';
  static SCHEDULING_BOOKING_CANCELLED = 'scheduling.booking.cancelled';
  static SCHEDULING_BOOKING_NO_SHOW = 'scheduling.booking.no_show';
  static SCHEDULING_PAYMENT_STATUS_CHANGED = 'scheduling.payment.status_changed';
  static CLINIC_PAYMENT_STATUS_CHANGED = 'clinic.payment.status_changed';
  static CLINIC_PAYMENT_SETTLED = 'clinic.payment.settled';
  static CLINIC_PAYMENT_REFUNDED = 'clinic.payment.refunded';
  static CLINIC_PAYMENT_CHARGEBACK = 'clinic.payment.chargeback';
  static CLINIC_TEMPLATE_PROPAGATED = 'clinic.template.propagated';
  static CLINIC_ALERT_TRIGGERED = 'clinic.alert.triggered';
  static CLINIC_ALERT_RESOLVED = 'clinic.alert.resolved';
  static CLINIC_OVERBOOKING_REVIEW_REQUESTED = 'clinic.overbooking.review_requested';
  static CLINIC_OVERBOOKING_REVIEWED = 'clinic.overbooking.reviewed';
  static CLINIC_PROFESSIONAL_TRANSFERRED = 'clinic.professional.transferred';
  static BILLING_INVOICE_REQUESTED = 'billing.invoice.requested';
  static BILLING_INVOICE_CANCELLATION_REQUESTED = 'billing.invoice.cancellation_requested';
  static BILLING_PAYMENT_STATUS_SYNC_REQUESTED = 'billing.payment.status_sync_requested';
  static BILLING_CLINIC_PAYMENT_PAYOUT_REQUESTED =
    'billing.clinic.payment_payout.requested';
  static ANALYTICS_SCHEDULING_METRIC_INCREMENTED = 'analytics.scheduling.metric.incremented';
  static NOTIFICATION_SCHEDULING_HOLD_CREATED = 'notifications.scheduling.hold.created';
  static NOTIFICATION_SCHEDULING_BOOKING_CREATED = 'notifications.scheduling.booking.created';
  static NOTIFICATION_SCHEDULING_BOOKING_CONFIRMED = 'notifications.scheduling.booking.confirmed';
  static NOTIFICATION_SCHEDULING_BOOKING_RESCHEDULED =
    'notifications.scheduling.booking.rescheduled';
  static NOTIFICATION_SCHEDULING_BOOKING_CANCELLED = 'notifications.scheduling.booking.cancelled';
  static NOTIFICATION_SCHEDULING_BOOKING_NO_SHOW = 'notifications.scheduling.booking.no_show';
  static NOTIFICATION_SCHEDULING_PAYMENT_STATUS_CHANGED =
    'notifications.scheduling.payment.status_changed';
  static NOTIFICATION_CLINIC_PAYMENT_SETTLED = 'notifications.clinic.payment.settled';
  static NOTIFICATION_CLINIC_PAYMENT_REFUNDED = 'notifications.clinic.payment.refunded';
  static NOTIFICATION_CLINIC_PAYMENT_CHARGEBACK = 'notifications.clinic.payment.chargeback';
  static NOTIFICATION_CLINIC_ALERT_TRIGGERED = 'notifications.clinic.alert.triggered';
  static NOTIFICATION_CLINIC_ALERT_RESOLVED = 'notifications.clinic.alert.resolved';
  static NOTIFICATION_CLINIC_OVERBOOKING_REVIEW_REQUESTED =
    'notifications.clinic.overbooking.review_requested';
  static NOTIFICATION_CLINIC_OVERBOOKING_REVIEWED = 'notifications.clinic.overbooking.reviewed';

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

  static schedulingHoldCreated(
    holdId: string,
    data: {
      tenantId: string;
      clinicId: string;
      professionalId: string;
      patientId: string;
      startAtUtc: Date;
      endAtUtc: Date;
      ttlExpiresAtUtc: Date;
    },
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(this.SCHEDULING_HOLD_CREATED, holdId, { holdId, ...data }, metadata);
  }

  static schedulingBookingCreated(
    bookingId: string,
    data: {
      tenantId: string;
      clinicId: string;
      professionalId: string;
      patientId: string;
      startAtUtc: Date;
      endAtUtc: Date;
      source: string;
      timezone: string;
    },
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.SCHEDULING_BOOKING_CREATED,
      bookingId,
      { bookingId, ...data, createdAt: new Date() },
      metadata,
    );
  }

  static schedulingHoldExpired(
    holdId: string,
    data: { tenantId: string; professionalId: string; clinicId: string },
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.SCHEDULING_HOLD_EXPIRED,
      holdId,
      { holdId, ...data, expiredAt: new Date() },
      metadata,
    );
  }

  static schedulingBookingConfirmed(
    bookingId: string,
    data: {
      tenantId: string;
      professionalId: string;
      clinicId: string;
      patientId: string;
      startAtUtc: Date;
      endAtUtc: Date;
      source: string;
    },
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.SCHEDULING_BOOKING_CONFIRMED,
      bookingId,
      { bookingId, ...data, confirmedAt: new Date() },
      metadata,
    );
  }

  static schedulingBookingRescheduled(
    bookingId: string,
    data: {
      tenantId: string;
      professionalId: string;
      clinicId: string;
      patientId: string;
      previousStartAtUtc: Date;
      previousEndAtUtc: Date;
      newStartAtUtc: Date;
      newEndAtUtc: Date;
    },
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.SCHEDULING_BOOKING_RESCHEDULED,
      bookingId,
      { bookingId, ...data, rescheduledAt: new Date() },
      metadata,
    );
  }

  static schedulingBookingCancelled(
    bookingId: string,
    data: {
      tenantId: string;
      professionalId: string;
      clinicId: string;
      patientId: string;
      cancelledBy: string;
      reason?: string;
    },
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.SCHEDULING_BOOKING_CANCELLED,
      bookingId,
      { bookingId, ...data, cancelledAt: new Date() },
      metadata,
    );
  }

  static schedulingBookingNoShow(
    bookingId: string,
    data: { tenantId: string; professionalId: string; clinicId: string; patientId: string },
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.SCHEDULING_BOOKING_NO_SHOW,
      bookingId,
      { bookingId, ...data, markedAt: new Date() },
      metadata,
    );
  }

  static schedulingPaymentStatusChanged(
    bookingId: string,
    data: {
      tenantId: string;
      professionalId: string;
      clinicId: string;
      patientId: string;
      previousStatus: string;
      newStatus: string;
    },
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.SCHEDULING_PAYMENT_STATUS_CHANGED,
      bookingId,
      { bookingId, ...data, changedAt: new Date() },
      metadata,
    );
  }

  static clinicPaymentStatusChanged(
    appointmentId: string,
    data: {
      tenantId: string;
      clinicId: string;
      professionalId: string;
      patientId: string;
      holdId: string;
      serviceTypeId: string;
      paymentTransactionId: string;
      previousStatus: string;
      newStatus: string;
      gatewayStatus: string;
      eventType?: string;
      sandbox: boolean;
      fingerprint?: string;
      payloadId?: string;
      amount?: { value?: number | null; netValue?: number | null };
      receivedAt: Date;
      paidAt?: Date;
    },
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    const { receivedAt, ...rest } = data;

    return this.createEvent(
      this.CLINIC_PAYMENT_STATUS_CHANGED,
      appointmentId,
      {
        appointmentId,
        ...rest,
        receivedAt,
        processedAt: new Date(),
      },
      metadata,
    );
  }

  static clinicPaymentSettled(
    appointmentId: string,
    data: {
      tenantId: string;
      clinicId: string;
      professionalId: string;
      patientId: string;
      holdId: string;
      serviceTypeId: string;
      paymentTransactionId: string;
      gatewayStatus: string;
      eventType?: string;
      sandbox: boolean;
      fingerprint?: string;
      payloadId?: string;
      amount?: { value?: number | null; netValue?: number | null };
      settledAt: Date;
    },
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.CLINIC_PAYMENT_SETTLED,
      appointmentId,
      {
        appointmentId,
        ...data,
        processedAt: new Date(),
      },
      metadata,
    );
  }

  static clinicPaymentRefunded(
    appointmentId: string,
    data: {
      tenantId: string;
      clinicId: string;
      professionalId: string;
      patientId: string;
      holdId: string;
      serviceTypeId: string;
      paymentTransactionId: string;
      gatewayStatus: string;
      eventType?: string;
      sandbox: boolean;
      fingerprint?: string;
      payloadId?: string;
      amount?: { value?: number | null; netValue?: number | null };
      refundedAt: Date;
    },
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.CLINIC_PAYMENT_REFUNDED,
      appointmentId,
      {
        appointmentId,
        ...data,
        processedAt: new Date(),
      },
      metadata,
    );
  }

  static clinicPaymentChargeback(
    appointmentId: string,
    data: {
      tenantId: string;
      clinicId: string;
      professionalId: string;
      patientId: string;
      holdId: string;
      serviceTypeId: string;
      paymentTransactionId: string;
      gatewayStatus: string;
      eventType?: string;
      sandbox: boolean;
      fingerprint?: string;
      payloadId?: string;
      amount?: { value?: number | null; netValue?: number | null };
      chargebackAt: Date;
    },
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.CLINIC_PAYMENT_CHARGEBACK,
      appointmentId,
      {
        appointmentId,
        ...data,
        processedAt: new Date(),
      },
      metadata,
    );
  }

  static billingInvoiceRequested(
    bookingId: string,
    data: {
      tenantId: string;
      professionalId: string;
      clinicId: string;
      patientId: string;
      source: string;
      confirmedAt: Date;
      startAtUtc: Date;
      endAtUtc: Date;
    },
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.BILLING_INVOICE_REQUESTED,
      bookingId,
      { bookingId, ...data, requestedAt: new Date() },
      metadata,
    );
  }

  static billingInvoiceCancellationRequested(
    bookingId: string,
    data: {
      tenantId: string;
      professionalId: string;
      clinicId: string;
      patientId: string;
      cancelledAt: Date;
      reason?: string | null;
    },
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.BILLING_INVOICE_CANCELLATION_REQUESTED,
      bookingId,
      { bookingId, ...data, requestedAt: new Date() },
      metadata,
    );
  }

  static billingPaymentStatusSyncRequested(
    bookingId: string,
    data: {
      tenantId: string;
      professionalId: string;
      clinicId: string;
      patientId: string;
      previousStatus: string;
      newStatus: string;
      changedAt: Date;
    },
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.BILLING_PAYMENT_STATUS_SYNC_REQUESTED,
      bookingId,
      { bookingId, ...data, requestedAt: new Date() },
      metadata,
    );
  }

  static billingClinicPaymentPayoutRequested(
    appointmentId: string,
    data: {
      tenantId: string;
      clinicId: string;
      professionalId: string;
      patientId: string;
      holdId: string;
      serviceTypeId: string;
      paymentTransactionId: string;
      provider: string;
      credentialsId: string;
      sandboxMode: boolean;
      bankAccountId?: string;
      settledAt: Date;
      baseAmountCents: number;
      netAmountCents?: number | null;
      split: ClinicPaymentSplitAllocation[];
      remainderCents: number;
      currency: ClinicCurrency;
      gatewayStatus: string;
      eventType?: string;
      fingerprint?: string;
      payloadId?: string;
      sandbox: boolean;
    },
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.BILLING_CLINIC_PAYMENT_PAYOUT_REQUESTED,
      appointmentId,
      {
        appointmentId,
        ...data,
        requestedAt: new Date(),
      },
      metadata,
    );
  }

  static analyticsSchedulingMetricIncremented(
    metric: string,
    data: {
      tenantId: string;
      clinicId?: string;
      professionalId?: string;
      patientId?: string;
      value?: number;
    },
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    const { value = 1, ...context } = data;

    return this.createEvent(
      this.ANALYTICS_SCHEDULING_METRIC_INCREMENTED,
      metric,
      { metric, value, ...context, recordedAt: new Date() },
      metadata,
    );
  }

  static notificationsSchedulingHoldCreated(
    holdId: string,
    data: {
      tenantId: string;
      clinicId: string;
      professionalId: string;
      patientId: string;
      startAtUtc: Date;
      endAtUtc: Date;
    },
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.NOTIFICATION_SCHEDULING_HOLD_CREATED,
      holdId,
      { holdId, ...data, queuedAt: new Date() },
      metadata,
    );
  }

  static clinicTemplatePropagated(
    templateClinicId: string,
    data: {
      tenantId: string;
      templateVersionId: string;
      propagatedVersionId: string;
      targetClinicId: string;
      section: string;
      triggeredBy: string;
    },
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.CLINIC_TEMPLATE_PROPAGATED,
      templateClinicId,
      { templateClinicId, ...data, propagatedAt: new Date() },
      metadata,
    );
  }

  static clinicAlertTriggered(
    alertId: string,
    data: {
      tenantId: string;
      clinicId: string;
      type: string;
      channel: string;
      triggeredBy: string;
      payload: Record<string, unknown>;
      triggeredAt?: Date;
    },
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.CLINIC_ALERT_TRIGGERED,
      alertId,
      {
        alertId,
        ...data,
        triggeredAt: data.triggeredAt ?? new Date(),
      },
      metadata,
    );
  }

  static clinicAlertResolved(
    alertId: string,
    data: {
      tenantId: string;
      clinicId: string;
      type: string;
      channel?: string;
      resolvedBy: string;
      resolvedAt: Date;
      triggeredAt?: Date;
      triggeredBy?: string;
      payload?: Record<string, unknown>;
    },
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.CLINIC_ALERT_RESOLVED,
      alertId,
      {
        alertId,
        ...data,
      },
      metadata,
    );
  }

  static clinicOverbookingReviewRequested(
    holdId: string,
    data: {
      tenantId: string;
      clinicId: string;
      professionalId: string;
      patientId: string;
      serviceTypeId: string;
      riskScore: number;
      threshold: number;
      reasons?: string[] | null;
      context?: Record<string, unknown> | null;
      requestedBy: string;
      requestedAt?: Date;
      autoApproved?: boolean;
    },
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    const { requestedAt, autoApproved = false, reasons, context, ...rest } = data;

    return this.createEvent(
      this.CLINIC_OVERBOOKING_REVIEW_REQUESTED,
      holdId,
      {
        holdId,
        ...rest,
        reasons: reasons ?? null,
        context: context ?? null,
        requestedAt: requestedAt ?? new Date(),
        autoApproved,
      },
      metadata,
    );
  }

  static clinicOverbookingReviewed(
    holdId: string,
    data: {
      tenantId: string;
      clinicId: string;
      professionalId: string;
      patientId: string;
      serviceTypeId: string;
      riskScore: number;
      threshold: number;
      status: 'approved' | 'rejected';
      reviewedBy: string;
      reviewedAt?: Date;
      justification?: string | null;
      reasons?: string[] | null;
      context?: Record<string, unknown> | null;
      autoApproved?: boolean;
      requestedBy?: string;
      requestedAt?: Date;
    },
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    const { reviewedAt, justification, reasons, context, autoApproved = false, ...rest } = data;

    return this.createEvent(
      this.CLINIC_OVERBOOKING_REVIEWED,
      holdId,
      {
        holdId,
        ...rest,
        reviewedAt: reviewedAt ?? new Date(),
        justification: justification ?? null,
        reasons: reasons ?? null,
        context: context ?? null,
        autoApproved,
      },
      metadata,
    );
  }

  static clinicProfessionalTransferred(
    professionalId: string,
    data: {
      tenantId: string;
      fromClinicId: string;
      toClinicId: string;
      effectiveDate: Date;
      transferPatients: boolean;
      fromMembershipId: string;
      toMembershipId: string;
    },
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.CLINIC_PROFESSIONAL_TRANSFERRED,
      professionalId,
      { professionalId, ...data },
      metadata,
    );
  }

  static notificationsSchedulingBookingCreated(
    bookingId: string,
    data: {
      tenantId: string;
      clinicId: string;
      professionalId: string;
      patientId: string;
      startAtUtc: Date;
      endAtUtc: Date;
      source: string;
      timezone: string;
    },
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.NOTIFICATION_SCHEDULING_BOOKING_CREATED,
      bookingId,
      { bookingId, ...data, queuedAt: new Date() },
      metadata,
    );
  }

  static notificationsSchedulingBookingConfirmed(
    bookingId: string,
    data: {
      tenantId: string;
      clinicId: string;
      professionalId: string;
      patientId: string;
      confirmedAt: Date;
    },
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.NOTIFICATION_SCHEDULING_BOOKING_CONFIRMED,
      bookingId,
      { bookingId, ...data, queuedAt: new Date() },
      metadata,
    );
  }

  static notificationsSchedulingBookingRescheduled(
    bookingId: string,
    data: {
      tenantId: string;
      clinicId: string;
      professionalId: string;
      patientId: string;
      previousStartAtUtc: Date;
      newStartAtUtc: Date;
      newEndAtUtc: Date;
    },
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.NOTIFICATION_SCHEDULING_BOOKING_RESCHEDULED,
      bookingId,
      { bookingId, ...data, queuedAt: new Date() },
      metadata,
    );
  }

  static notificationsSchedulingBookingCancelled(
    bookingId: string,
    data: {
      tenantId: string;
      clinicId: string;
      professionalId: string;
      patientId: string;
      cancelledAt: Date;
      reason?: string | null;
    },
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.NOTIFICATION_SCHEDULING_BOOKING_CANCELLED,
      bookingId,
      { bookingId, ...data, queuedAt: new Date() },
      metadata,
    );
  }

  static notificationsSchedulingBookingNoShow(
    bookingId: string,
    data: {
      tenantId: string;
      clinicId: string;
      professionalId: string;
      patientId: string;
      markedAt: Date;
    },
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.NOTIFICATION_SCHEDULING_BOOKING_NO_SHOW,
      bookingId,
      { bookingId, ...data, queuedAt: new Date() },
      metadata,
    );
  }

  static notificationsSchedulingPaymentStatusChanged(
    bookingId: string,
    data: {
      tenantId: string;
      clinicId: string;
      professionalId: string;
      patientId: string;
      previousStatus: string;
      newStatus: string;
      changedAt: Date;
    },
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.NOTIFICATION_SCHEDULING_PAYMENT_STATUS_CHANGED,
      bookingId,
      { bookingId, ...data, queuedAt: new Date() },
      metadata,
    );
  }

  static notificationsClinicPaymentSettled(
    appointmentId: string,
    data: {
      tenantId: string;
      clinicId: string;
      professionalId: string;
      patientId: string;
      serviceTypeId: string;
      paymentTransactionId: string;
      settledAt: Date;
      amount: { baseAmountCents: number; netAmountCents?: number | null };
      split: Array<Record<string, unknown>>;
      remainderCents: number;
      recipientIds: string[];
      gatewayStatus: string;
      sandbox?: boolean;
      fingerprint?: string | null;
      payloadId?: string | null;
      channels?: string[];
    },
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.NOTIFICATION_CLINIC_PAYMENT_SETTLED,
      appointmentId,
      {
        appointmentId,
        status: 'settled',
        ...data,
        queuedAt: new Date(),
      },
      metadata,
    );
  }

  static notificationsClinicPaymentRefunded(
    appointmentId: string,
    data: {
      tenantId: string;
      clinicId: string;
      professionalId: string;
      patientId: string;
      serviceTypeId: string;
      paymentTransactionId: string;
      refundedAt: Date;
      amount: { valueCents?: number | null; netValueCents?: number | null };
      reason?: string | null;
      recipientIds: string[];
      gatewayStatus: string;
      sandbox?: boolean;
      fingerprint?: string | null;
      payloadId?: string | null;
      channels?: string[];
    },
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.NOTIFICATION_CLINIC_PAYMENT_REFUNDED,
      appointmentId,
      {
        appointmentId,
        status: 'refunded',
        ...data,
        queuedAt: new Date(),
      },
      metadata,
    );
  }

  static notificationsClinicPaymentChargeback(
    appointmentId: string,
    data: {
      tenantId: string;
      clinicId: string;
      professionalId: string;
      patientId: string;
      serviceTypeId: string;
      paymentTransactionId: string;
      chargebackAt: Date;
      reason?: string | null;
      recipientIds: string[];
      gatewayStatus: string;
      sandbox?: boolean;
      fingerprint?: string | null;
      payloadId?: string | null;
      channels?: string[];
    },
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.NOTIFICATION_CLINIC_PAYMENT_CHARGEBACK,
      appointmentId,
      {
        appointmentId,
        status: 'chargeback',
        ...data,
        queuedAt: new Date(),
      },
      metadata,
    );
  }

  static notificationsClinicOverbookingReviewRequested(
    holdId: string,
    data: {
      tenantId: string;
      clinicId: string;
      professionalId: string;
      patientId: string;
      serviceTypeId: string;
      riskScore: number;
      threshold: number;
      requestedBy: string;
      requestedAt: Date;
      reasons?: string[] | null;
      context?: Record<string, unknown> | null;
      autoApproved?: boolean;
      recipientIds: string[];
      channels: string[];
    },
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.NOTIFICATION_CLINIC_OVERBOOKING_REVIEW_REQUESTED,
      holdId,
      {
        holdId,
        status: 'pending_review',
        ...data,
        queuedAt: new Date(),
      },
      metadata,
    );
  }

  static notificationsClinicOverbookingReviewed(
    holdId: string,
    data: {
      tenantId: string;
      clinicId: string;
      professionalId: string;
      patientId: string;
      serviceTypeId: string;
      status: 'approved' | 'rejected';
      riskScore: number;
      threshold: number;
      reviewedBy: string;
      reviewedAt: Date;
      justification?: string | null;
      reasons?: string[] | null;
      context?: Record<string, unknown> | null;
      autoApproved?: boolean;
      requestedBy?: string;
      requestedAt?: Date;
      recipientIds: string[];
      channels: string[];
    },
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.NOTIFICATION_CLINIC_OVERBOOKING_REVIEWED,
      holdId,
      {
        holdId,
        ...data,
        queuedAt: new Date(),
      },
      metadata,
    );
  }

  static notificationsClinicAlertTriggered(
    alertId: string,
    data: {
      tenantId: string;
      clinicId: string;
      type: string;
      channel: string;
      triggeredBy: string;
      triggeredAt: Date;
      payload: Record<string, unknown>;
      recipientIds: string[];
    },
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.NOTIFICATION_CLINIC_ALERT_TRIGGERED,
      alertId,
      { alertId, ...data, queuedAt: new Date() },
      metadata,
    );
  }

  static notificationsClinicAlertResolved(
    alertId: string,
    data: {
      tenantId: string;
      clinicId: string;
      type: string;
      channel?: string;
      resolvedBy: string;
      resolvedAt: Date;
      triggeredAt?: Date;
      triggeredBy?: string;
      payload?: Record<string, unknown>;
      recipientIds: string[];
    },
    metadata?: DomainEventMetadata,
  ): DomainEvent {
    return this.createEvent(
      this.NOTIFICATION_CLINIC_ALERT_RESOLVED,
      alertId,
      { alertId, ...data, queuedAt: new Date() },
      metadata,
    );
  }
}
