import { z } from 'zod';

const clinicConfigurationSectionEnum = z.enum([
  'general',
  'team',
  'schedule',
  'services',
  'payments',
  'integrations',
  'notifications',
  'branding',
]);

const booleanString = z.union([z.string(), z.boolean()]).transform((value) => {
  if (typeof value === 'boolean') {
    return value;
  }
  const normalized = value.trim().toLowerCase();
  return ['true', '1', 'yes'].includes(normalized);
});

export const listClinicTemplateOverridesSchema = z.object({
  tenantId: z.string().uuid().optional(),
  section: clinicConfigurationSectionEnum.optional(),
  includeSuperseded: booleanString.optional(),
  page: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => (value === undefined ? undefined : Number(value)))
    .refine((value) => value === undefined || (Number.isInteger(value) && value > 0), {
      message: 'page deve ser um numero inteiro positivo',
    }),
  limit: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => (value === undefined ? undefined : Number(value)))
    .refine((value) => value === undefined || (Number.isInteger(value) && value > 0), {
      message: 'limit deve ser um numero inteiro positivo',
    }),
});

export type ListClinicTemplateOverridesSchema = z.infer<typeof listClinicTemplateOverridesSchema>;
