import { RolesEnum } from '../../../../domain/auth/enums/roles.enum';
import { CreateBookingUseCaseInput } from '../../../../domain/scheduling/interfaces/use-cases/create-booking.use-case.interface';
import { CancelBookingUseCaseInput } from '../../../../domain/scheduling/interfaces/use-cases/cancel-booking.use-case.interface';
import { CreateHoldUseCaseInput } from '../../../../domain/scheduling/interfaces/use-cases/create-hold.use-case.interface';
import { ConfirmBookingUseCaseInput } from '../../../../domain/scheduling/interfaces/use-cases/confirm-booking.use-case.interface';
import { RescheduleBookingUseCaseInput } from '../../../../domain/scheduling/interfaces/use-cases/reschedule-booking.use-case.interface';
import { MarkBookingNoShowUseCaseInput } from '../../../../domain/scheduling/interfaces/use-cases/mark-booking-no-show.use-case.interface';
import { RecordPaymentStatusUseCaseInput } from '../../../../domain/scheduling/interfaces/use-cases/record-payment-status.use-case.interface';
import { CancelBookingSchema } from '../schemas/cancel-booking.schema';
import { CreateBookingSchema } from '../schemas/create-booking.schema';
import { CreateHoldSchema } from '../schemas/create-hold.schema';
import { ConfirmBookingSchema } from '../schemas/confirm-booking.schema';
import { RescheduleBookingSchema } from '../schemas/reschedule-booking.schema';
import { MarkBookingNoShowSchema } from '../schemas/mark-booking-no-show.schema';
import { UpdatePaymentStatusSchema } from '../schemas/update-payment-status.schema';

export interface SchedulingRequestContext {
  tenantId: string;
  userId: string;
  role: RolesEnum;
}

export const toCreateBookingInput = (
  payload: CreateBookingSchema,
  context: SchedulingRequestContext,
): CreateBookingUseCaseInput => ({
  tenantId: context.tenantId,
  holdId: payload.holdId,
  source: payload.source,
  timezone: payload.timezone,
  paymentStatus: payload.paymentStatus,
  lateToleranceMinutes: payload.lateToleranceMinutes ?? undefined,
  recurrenceSeriesId: payload.recurrenceSeriesId ?? null,
  pricingSplit: payload.pricingSplit ?? null,
  preconditionsPassed: payload.preconditionsPassed ?? false,
  anamneseRequired: payload.anamneseRequired ?? false,
  anamneseOverrideReason: payload.anamneseOverrideReason ?? null,
  requesterId: context.userId,
  requesterRole: context.role,
  requestedAtUtc: new Date(),
});

export const toCreateHoldInput = (
  payload: CreateHoldSchema,
  context: SchedulingRequestContext,
): CreateHoldUseCaseInput => ({
  tenantId: context.tenantId,
  clinicId: payload.clinicId,
  professionalId: payload.professionalId,
  patientId: payload.patientId,
  serviceTypeId: payload.serviceTypeId,
  startAtUtc: new Date(payload.startAtUtc),
  endAtUtc: new Date(payload.endAtUtc),
  requesterId: context.userId,
  requesterRole: context.role,
});

export const toCancelBookingInput = (
  bookingId: string,
  payload: CancelBookingSchema,
  context: SchedulingRequestContext,
): CancelBookingUseCaseInput => ({
  tenantId: context.tenantId,
  bookingId,
  expectedVersion: payload.expectedVersion,
  reason: payload.reason ?? null,
  requesterId: context.userId,
  requesterRole: context.role,
  cancelledAtUtc: payload.cancelledAtUtc ? new Date(payload.cancelledAtUtc) : undefined,
});

export const toConfirmBookingInput = (
  bookingId: string,
  payload: ConfirmBookingSchema,
  context: SchedulingRequestContext,
): ConfirmBookingUseCaseInput => ({
  tenantId: context.tenantId,
  bookingId,
  holdId: payload.holdId,
  paymentStatus: payload.paymentStatus,
  requesterId: context.userId,
  requesterRole: context.role,
  confirmationAtUtc: payload.confirmationAtUtc ? new Date(payload.confirmationAtUtc) : undefined,
});

export const toRecordPaymentStatusInput = (
  bookingId: string,
  payload: UpdatePaymentStatusSchema,
  context: SchedulingRequestContext,
): RecordPaymentStatusUseCaseInput => ({
  tenantId: context.tenantId,
  bookingId,
  expectedVersion: payload.expectedVersion,
  paymentStatus: payload.paymentStatus,
  requesterId: context.userId,
  requesterRole: context.role,
});

export const toRescheduleBookingInput = (
  bookingId: string,
  payload: RescheduleBookingSchema,
  context: SchedulingRequestContext,
): RescheduleBookingUseCaseInput => ({
  tenantId: context.tenantId,
  bookingId,
  expectedVersion: payload.expectedVersion,
  newStartAtUtc: new Date(payload.newStartAtUtc),
  newEndAtUtc: new Date(payload.newEndAtUtc),
  requesterId: context.userId,
  requesterRole: context.role,
  reason: payload.reason,
});

export const toMarkBookingNoShowInput = (
  bookingId: string,
  payload: MarkBookingNoShowSchema,
  context: SchedulingRequestContext,
): MarkBookingNoShowUseCaseInput => ({
  tenantId: context.tenantId,
  bookingId,
  expectedVersion: payload.expectedVersion,
  markedAtUtc: payload.markedAtUtc ? new Date(payload.markedAtUtc) : new Date(),
});
