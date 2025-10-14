import { z } from 'zod';

const alertTypes = ['revenue_drop', 'low_occupancy', 'staff_shortage', 'compliance'] as const;
const alertTypeSchema = z.enum(alertTypes);

const toStringArray = (value: unknown): string[] | undefined => {
  if (!value) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return undefined;
};

const toBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }

  return undefined;
};

export const getClinicManagementAlertsSchema = z.object({
  tenantId: z.string().uuid().optional(),
  clinicId: z.string().uuid().optional(),
  clinicIds: z
    .preprocess((value) => toStringArray(value), z.array(z.string().uuid()).optional())
    .optional(),
  types: z
    .preprocess((value) => toStringArray(value), z.array(alertTypeSchema).optional())
    .optional(),
  activeOnly: z.preprocess((value) => toBoolean(value), z.boolean().optional()).optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
});

export type GetClinicManagementAlertsSchema = z.infer<typeof getClinicManagementAlertsSchema>;
