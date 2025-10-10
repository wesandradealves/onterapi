import { z } from 'zod';

const confirmPaymentStatusEnum = z.enum(['approved']);

export const confirmBookingSchema = z.object({
  holdId: z.string().uuid(),
  paymentStatus: confirmPaymentStatusEnum,
  confirmationAtUtc: z.string().datetime().optional(),
});

export type ConfirmBookingSchema = z.infer<typeof confirmBookingSchema>;
