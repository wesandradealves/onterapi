import { z } from 'zod';

const clinicDocumentSchema = z.object({
  type: z.enum(['cnpj', 'cpf', 'mei']),
  value: z.string().min(3),
});

const holdSettingsSchema = z.object({
  ttlMinutes: z.number().int().positive(),
  minAdvanceMinutes: z.number().int().nonnegative(),
  maxAdvanceMinutes: z.number().int().positive().optional(),
  allowOverbooking: z.boolean().optional().default(false),
  overbookingThreshold: z.number().int().min(0).max(100).optional(),
  resourceMatchingStrict: z.boolean().optional().default(true),
});

export const createClinicSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  primaryOwnerId: z.string().uuid(),
  document: clinicDocumentSchema.optional(),
  holdSettings: holdSettingsSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateClinicSchema = z.infer<typeof createClinicSchema>;
