import { z } from 'zod';

export const transferClinicProfessionalSchema = z.object({
  tenantId: z.string().uuid().optional(),
  professionalId: z.string().uuid(),
  fromClinicId: z.string().uuid(),
  toClinicId: z.string().uuid(),
  effectiveDate: z.coerce.date(),
  transferPatients: z.boolean().default(false),
});

export type TransferClinicProfessionalSchema = z.infer<typeof transferClinicProfessionalSchema>;
