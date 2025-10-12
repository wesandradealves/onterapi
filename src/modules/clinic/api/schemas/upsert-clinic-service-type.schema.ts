import { z } from 'zod';

const clinicServiceCustomFieldSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1),
  fieldType: z.enum(['text', 'number', 'boolean', 'select', 'date']),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
});

export const upsertClinicServiceTypeSchema = z.object({
  tenantId: z.string().uuid().optional(),
  service: z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1),
    slug: z.string().min(1),
    color: z.string().optional(),
    durationMinutes: z.number().int().positive(),
    price: z.number().positive(),
    currency: z.string().length(3),
    isActive: z.boolean().optional().default(true),
    requiresAnamnesis: z.boolean().optional().default(false),
    enableOnlineScheduling: z.boolean().optional().default(true),
    minAdvanceMinutes: z.number().int().nonnegative(),
    maxAdvanceMinutes: z.number().int().positive().optional(),
    cancellationPolicy: z.record(z.unknown()),
    eligibility: z.record(z.unknown()),
    instructions: z.string().optional(),
    requiredDocuments: z.array(z.string()).optional(),
    customFields: z.array(clinicServiceCustomFieldSchema).optional(),
  }),
});

export type UpsertClinicServiceTypeSchema = z.infer<typeof upsertClinicServiceTypeSchema>;

export const listClinicServiceTypesSchema = z.object({
  tenantId: z.string().uuid().optional(),
  includeInactive: z
    .preprocess((value) => {
      if (value === undefined || value === null || value === '') {
        return undefined;
      }
      if (typeof value === 'string') {
        return value === 'true';
      }
      return value;
    }, z.boolean())
    .optional(),
});

export type ListClinicServiceTypesSchema = z.infer<typeof listClinicServiceTypesSchema>;
