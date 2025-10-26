import { z } from 'zod';

export const createClinicHoldSchema = z.object({
  tenantId: z.string().uuid().optional(),
  professionalId: z.string().uuid(),
  patientId: z.string().uuid(),
  serviceTypeId: z.string().uuid(),
  start: z.string().datetime(),
  end: z.string().datetime(),
  locationId: z.string().uuid().optional(),
  resources: z.array(z.string()).optional(),
  idempotencyKey: z.string().min(6),
  channel: z.enum(['direct', 'marketplace']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateClinicHoldSchema = z.infer<typeof createClinicHoldSchema>;
