import { z } from 'zod';

export const updateClinicHoldSettingsSchema = z.object({
  tenantId: z.string().uuid().optional(),
  holdSettings: z.object({
    ttlMinutes: z.number().int().positive(),
    minAdvanceMinutes: z.number().int().nonnegative(),
    maxAdvanceMinutes: z.number().int().positive().optional(),
    allowOverbooking: z.boolean(),
    overbookingThreshold: z.number().int().min(0).max(100).optional(),
    resourceMatchingStrict: z.boolean(),
  }),
});

export type UpdateClinicHoldSettingsSchema = z.infer<typeof updateClinicHoldSettingsSchema>;
