import { z } from 'zod';

export const markBookingNoShowSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  markedAtUtc: z.string().datetime().optional(),
});

export type MarkBookingNoShowSchema = z.infer<typeof markBookingNoShowSchema>;
