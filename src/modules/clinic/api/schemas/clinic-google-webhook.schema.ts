import { z } from 'zod';

export const clinicGoogleCalendarEventSchema = z.object({
  externalEventId: z.string().min(1),
  status: z.enum(['confirmed', 'tentative', 'cancelled']),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  timezone: z.string().min(1),
  summary: z.string().optional(),
  description: z.string().optional(),
  locationId: z.string().optional(),
  resources: z.array(z.string().min(1)).optional(),
  calendarId: z.string().optional(),
  rawPayload: z.record(z.unknown()).optional(),
});

export const clinicGoogleWebhookSchema = z.object({
  tenantId: z.string().uuid(),
  clinicId: z.string().uuid(),
  professionalId: z.string().uuid(),
  triggeredBy: z.string().min(1).optional(),
  event: clinicGoogleCalendarEventSchema,
});

export type ClinicGoogleCalendarEventSchema = z.infer<typeof clinicGoogleCalendarEventSchema>;
export type ClinicGoogleWebhookSchema = z.infer<typeof clinicGoogleWebhookSchema>;
