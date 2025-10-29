import { z } from 'zod';

export const evaluateClinicAlertsSchema = z.object({
  clinicIds: z
    .array(z.string().uuid({ message: 'clinicIds deve conter UUIDs validos' }))
    .optional(),
});

export type EvaluateClinicAlertsSchema = z.infer<typeof evaluateClinicAlertsSchema>;
