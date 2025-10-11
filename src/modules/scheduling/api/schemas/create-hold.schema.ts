import { z } from 'zod';

export const createHoldSchema = z.object({
  clinicId: z.string().uuid(),
  professionalId: z.string().uuid(),
  patientId: z.string().uuid(),
  startAtUtc: z.string().datetime(),
  endAtUtc: z.string().datetime(),
});

export type CreateHoldSchema = z.infer<typeof createHoldSchema>;
