import { z } from 'zod';

export const getClinicDashboardSchema = z.object({
  tenantId: z.string().uuid().optional(),
  clinicIds: z
    .preprocess((value) => {
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
    }, z.array(z.string().uuid()).optional())
    .optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  includeForecast: z
    .union([z.boolean(), z.string().transform((val) => val === 'true')])
    .optional(),
  includeComparisons: z
    .union([z.boolean(), z.string().transform((val) => val === 'true')])
    .optional(),
});

export type GetClinicDashboardSchema = z.infer<typeof getClinicDashboardSchema>;
