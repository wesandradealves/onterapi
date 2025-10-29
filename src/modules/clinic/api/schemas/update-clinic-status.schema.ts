import { z } from 'zod';

export const updateClinicStatusSchema = z.object({
  tenantId: z.string().uuid().optional(),
  status: z.enum(['draft', 'pending', 'active', 'inactive', 'suspended']),
});

export type UpdateClinicStatusSchema = z.infer<typeof updateClinicStatusSchema>;
