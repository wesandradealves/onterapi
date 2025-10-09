import { z } from 'zod';

export const rescheduleBookingSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  newStartAtUtc: z.string().datetime(),
  newEndAtUtc: z.string().datetime(),
  reason: z.string().min(3),
});

export type RescheduleBookingSchema = z.infer<typeof rescheduleBookingSchema>;
