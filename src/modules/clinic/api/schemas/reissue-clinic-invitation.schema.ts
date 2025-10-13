import { z } from 'zod';

export const reissueClinicInvitationSchema = z.object({
  tenantId: z.string().uuid().optional(),
  expiresAt: z.string().datetime(),
  channel: z.enum(['email', 'whatsapp']).optional(),
});

export type ReissueClinicInvitationSchema = z.infer<typeof reissueClinicInvitationSchema>;
