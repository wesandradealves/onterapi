import { z } from 'zod';

export const listClinicsSchema = z.object({
  tenantId: z.string().uuid().optional(),
  status: z
    .preprocess(
      (value) => {
        if (!value) return undefined;
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
          return value.split(',').map((item) => item.trim());
        }
        return undefined;
      },
      z.array(z.enum(['draft', 'pending', 'active', 'inactive', 'suspended'])).optional(),
    )
    .optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  includeDeleted: z
    .preprocess((value) => {
      if (value === undefined || value === null || value === '') return undefined;
      if (typeof value === 'string') return value === 'true';
      return value;
    }, z.boolean())
    .optional(),
});

export type ListClinicsSchema = z.infer<typeof listClinicsSchema>;
