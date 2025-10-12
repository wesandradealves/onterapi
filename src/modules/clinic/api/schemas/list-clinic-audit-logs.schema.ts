import { z } from 'zod';

export const listClinicAuditLogsSchema = z.object({
  tenantId: z.string().uuid().optional(),
  events: z
    .preprocess((value) => {
      if (Array.isArray(value)) {
        return value;
      }
      if (typeof value === 'string') {
        return value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
      }
      return undefined;
    }, z.array(z.string()).optional())
    .optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export type ListClinicAuditLogsSchema = z.infer<typeof listClinicAuditLogsSchema>;
