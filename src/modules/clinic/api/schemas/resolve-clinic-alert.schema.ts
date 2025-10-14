import { z } from 'zod';

export const resolveClinicAlertSchema = z.object({
  resolvedAt: z.string().datetime().optional(),
});

export type ResolveClinicAlertSchema = z.infer<typeof resolveClinicAlertSchema>;
