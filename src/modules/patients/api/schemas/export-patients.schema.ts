import { z } from 'zod';

export const exportPatientsSchema = z.object({
  format: z.enum(['pdf', 'csv', 'excel', 'vcard']),
  professionalIds: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => (typeof value === 'string' ? [value] : value)),
  status: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => (typeof value === 'string' ? [value] : value)),
  quickFilter: z.string().optional(),
  includeMedicalData: z.boolean().optional(),
  tenantId: z.string().uuid().optional(),
});

export type ExportPatientsSchema = z.infer<typeof exportPatientsSchema>;
