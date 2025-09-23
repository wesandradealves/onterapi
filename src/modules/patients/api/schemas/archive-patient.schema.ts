import { z } from 'zod';

export const archivePatientSchema = z.object({
  reason: z.string().optional(),
  archiveRelatedData: z.boolean().optional(),
});

export type ArchivePatientSchema = z.infer<typeof archivePatientSchema>;
