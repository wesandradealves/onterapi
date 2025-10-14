import { z } from 'zod';

export const listNotificationEventsSchema = z.object({
  eventName: z.string().max(150).optional(),
  status: z.enum(['queued', 'processed', 'failed']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export type ListNotificationEventsSchema = z.infer<typeof listNotificationEventsSchema>;
