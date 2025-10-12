import { z } from 'zod';

export const confirmClinicHoldSchema = z.object({
  tenantId: z.string().uuid().optional(),
  paymentTransactionId: z.string().trim().min(1).max(120),
  idempotencyKey: z.string().trim().min(1).max(120),
});

export type ConfirmClinicHoldSchema = z.infer<typeof confirmClinicHoldSchema>;
