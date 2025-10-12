import { z } from 'zod';

const invitationEconomicItemSchema = z.object({
  serviceTypeId: z.string().uuid(),
  price: z.number().positive(),
  currency: z.string().length(3),
  payoutModel: z.enum(['fixed', 'percentage']),
  payoutValue: z.number().positive(),
});

export const inviteClinicProfessionalSchema = z.object({
  tenantId: z.string().uuid(),
  professionalId: z.string().uuid().optional(),
  email: z.string().email().optional(),
  channel: z.enum(['email', 'whatsapp']),
  economicSummary: z.object({
    items: z.array(invitationEconomicItemSchema).min(1),
    orderOfRemainders: z.array(
      z.enum(['taxes', 'gateway', 'clinic', 'professional', 'platform']),
    ),
    roundingStrategy: z.literal('half_even'),
  }),
  expiresAt: z.string().datetime(),
  metadata: z.record(z.unknown()).optional(),
});

export type InviteClinicProfessionalSchema = z.infer<typeof inviteClinicProfessionalSchema>;

export const acceptClinicInvitationSchema = z.object({
  tenantId: z.string().uuid(),
  token: z.string().min(10),
});

export type AcceptClinicInvitationSchema = z.infer<typeof acceptClinicInvitationSchema>;

export const revokeClinicInvitationSchema = z.object({
  tenantId: z.string().uuid(),
  reason: z.string().optional(),
});

export type RevokeClinicInvitationSchema = z.infer<typeof revokeClinicInvitationSchema>;

export const listClinicInvitationsSchema = z.object({
  tenantId: z.string().uuid(),
  status: z
    .preprocess((value) => {
      if (!value) return undefined;
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') {
        return value.split(',').map((item) => item.trim());
      }
      return undefined;
    }, z.array(z.enum(['pending', 'accepted', 'declined', 'revoked', 'expired'])).optional())
    .optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export type ListClinicInvitationsSchema = z.infer<typeof listClinicInvitationsSchema>;
