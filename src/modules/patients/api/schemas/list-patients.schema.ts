import { z } from 'zod';

const statusEnum = z.enum(['new', 'active', 'inactive', 'in_treatment', 'finished']);
const riskLevelEnum = z.enum(['low', 'medium', 'high']);
const quickFilterEnum = z.enum(['inactive_30_days', 'no_anamnesis', 'needs_follow_up', 'birthday_week']);

const normalizeToArray = <T>(value: T | T[] | undefined): T[] | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return Array.isArray(value) ? value : [value];
};

export const listPatientsSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  query: z.string().trim().optional(),
  status: z
    .union([statusEnum, z.array(statusEnum)])
    .optional()
    .transform((value) => normalizeToArray(value)),
  riskLevel: z
    .union([riskLevelEnum, z.array(riskLevelEnum)])
    .optional()
    .transform((value) => normalizeToArray(value)),
  professionalIds: z
    .union([z.string().uuid(), z.array(z.string().uuid())])
    .optional()
    .transform((value) => normalizeToArray(value)),
  tags: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => normalizeToArray(value)),
  quickFilter: quickFilterEnum.optional(),
  tenantId: z.string().uuid().optional(),
});

export type ListPatientsSchema = z.infer<typeof listPatientsSchema>;
