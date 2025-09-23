import { z } from 'zod';

export const transferPatientSchema = z.object({
  toProfessionalId: z.string().uuid(),
  reason: z.string().min(3),
  effectiveAt: z.string().datetime().optional(),
});

export type TransferPatientSchema = z.infer<typeof transferPatientSchema>;
