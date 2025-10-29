import { z } from 'zod';

const comparisonMetricEnum = z.enum([
  'revenue',
  'appointments',
  'patients',
  'occupancy',
  'satisfaction',
]);

const clinicIdsPreprocessor = (value: unknown) => {
  if (!value) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim());
  }

  return undefined;
};

export const compareClinicsSchema = z.object({
  tenantId: z.string().uuid().optional(),
  clinicIds: z.preprocess(clinicIdsPreprocessor, z.array(z.string().uuid()).optional()).optional(),
  metric: comparisonMetricEnum.default('revenue'),
  from: z.string().datetime(),
  to: z.string().datetime(),
  limit: z
    .preprocess((value) => {
      if (value === undefined || value === null || value === '') {
        return undefined;
      }

      const parsed = typeof value === 'string' ? Number(value) : value;
      if (Number.isFinite(parsed)) {
        return parsed;
      }
      return undefined;
    }, z.number().int().min(1).max(200).optional())
    .optional(),
});

export type CompareClinicsSchema = z.infer<typeof compareClinicsSchema>;
