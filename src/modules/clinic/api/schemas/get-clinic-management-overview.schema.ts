import { z } from 'zod';

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

export const getClinicManagementOverviewSchema = z.object({
  tenantId: z.string().uuid().optional(),
  clinicIds: z
    .preprocess((value) => toStringArray(value), z.array(z.string().uuid()).optional())
    .optional(),
  status: z
    .preprocess(
      (value) => toStringArray(value),
      z.array(z.enum(['draft', 'pending', 'active', 'inactive', 'suspended'])).optional(),
    )
    .optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  includeForecast: z.preprocess((value) => toBoolean(value), z.boolean().optional()).optional(),
  includeComparisons: z.preprocess((value) => toBoolean(value), z.boolean().optional()).optional(),
  includeAlerts: z.preprocess((value) => toBoolean(value), z.boolean().optional()).optional(),
  includeTeamDistribution: z
    .preprocess((value) => toBoolean(value), z.boolean().optional())
    .optional(),
  includeFinancials: z.preprocess((value) => toBoolean(value), z.boolean().optional()).optional(),
  includeCoverageSummary: z
    .preprocess((value) => toBoolean(value), z.boolean().optional())
    .optional(),
});

export type GetClinicManagementOverviewSchema = z.infer<typeof getClinicManagementOverviewSchema>;
