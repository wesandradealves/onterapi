import { z } from 'zod';

export const cancellationReasonEnum = z.enum([
  'patient_request',
  'clinic_request',
  'professional_request',
  'medical_exception',
  'system',
  'payment_failure',
  'chargeback',
]);

export const cancelBookingSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  reason: cancellationReasonEnum.optional(),
  cancelledAtUtc: z.string().datetime().optional(),
});

export type CancelBookingSchema = z.infer<typeof cancelBookingSchema>;
