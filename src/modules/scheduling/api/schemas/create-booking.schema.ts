import { z } from 'zod';

export const bookingSourceEnum = z.enum([
  'marketplace',
  'clinic_portal',
  'professional_portal',
  'patient_portal',
  'api',
]);

export const paymentStatusEnum = z.enum([
  'not_applied',
  'pending',
  'approved',
  'settled',
  'refunded',
  'disputed',
]);

const pricingSplitSchema = z.object({
  totalCents: z.number().int().nonnegative(),
  platformCents: z.number().int().nonnegative(),
  clinicCents: z.number().int().nonnegative(),
  professionalCents: z.number().int().nonnegative(),
  gatewayCents: z.number().int().nonnegative(),
  taxesCents: z.number().int().nonnegative(),
  currency: z.string().min(1),
});

export const createBookingSchema = z.object({
  holdId: z.string().uuid(),
  source: bookingSourceEnum,
  timezone: z.string().min(1),
  paymentStatus: paymentStatusEnum.optional(),
  lateToleranceMinutes: z.number().int().nonnegative().optional(),
  recurrenceSeriesId: z.string().uuid().optional(),
  pricingSplit: pricingSplitSchema.optional().nullable(),
  preconditionsPassed: z.boolean().optional(),
  anamneseRequired: z.boolean().optional(),
  anamneseOverrideReason: z.string().min(1).optional(),
});

export type CreateBookingSchema = z.infer<typeof createBookingSchema>;
