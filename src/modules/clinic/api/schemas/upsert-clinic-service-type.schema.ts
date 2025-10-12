import { z } from 'zod';

const clinicServiceCancellationPolicySchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('free'),
    message: z.string().max(500).optional(),
  }),
  z.object({
    type: z.literal('percentage'),
    windowMinutes: z.number().int().nonnegative(),
    percentage: z.number().min(0).max(100),
    message: z.string().max(500).optional(),
  }),
  z.object({
    type: z.literal('no_refund'),
    message: z.string().max(500).optional(),
  }),
]);

const clinicServiceEligibilitySchema = z
  .object({
    allowNewPatients: z.boolean(),
    allowExistingPatients: z.boolean(),
    minimumAge: z.number().int().min(0).optional(),
    maximumAge: z.number().int().min(0).optional(),
    allowedTags: z.array(z.string().min(1)).optional(),
  })
  .refine(
    (value) => {
      if (value.minimumAge !== undefined && value.maximumAge !== undefined) {
        return value.minimumAge <= value.maximumAge;
      }
      return true;
    },
    { message: 'minimumAge nao pode ser maior que maximumAge', path: ['maximumAge'] },
  );

const clinicServiceCustomFieldSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().min(1),
  fieldType: z.enum(['text', 'number', 'boolean', 'select', 'date']),
  required: z.boolean(),
  options: z.array(z.string().min(1)).max(50).optional(),
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
    cancellationPolicy: clinicServiceCancellationPolicySchema,
    eligibility: clinicServiceEligibilitySchema,
    instructions: z.string().optional(),
    requiredDocuments: z.array(z.string().min(1)).optional(),
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
