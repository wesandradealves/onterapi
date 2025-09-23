import { z } from 'zod';

export const listPatientsSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  query: z.string().trim().optional(),
  status: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => (typeof value === 'string' ? [value] : value)),
  riskLevel: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => (typeof value === 'string' ? [value] : value)),
  professionalIds: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => (typeof value === 'string' ? [value] : value)),
  tags: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => (typeof value === 'string' ? [value] : value)),
  quickFilter: z.string().optional(),
  tenantId: z.string().uuid().optional(),
});

export type ListPatientsSchema = z.infer<typeof listPatientsSchema>;
