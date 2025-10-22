import { z } from 'zod';

const invitationEconomicItemSchema = z
  .object({
    serviceTypeId: z.string().uuid(),
    price: z.number().positive(),
    currency: z.enum(['BRL', 'USD', 'EUR']),
    payoutModel: z.enum(['fixed', 'percentage']),
    payoutValue: z.number().nonnegative(),
  })
  .superRefine((item, ctx) => {
    if (item.payoutModel === 'percentage') {
      if (item.payoutValue < 0 || item.payoutValue > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'payoutValue deve estar entre 0 e 100 para percentual',
          path: ['payoutValue'],
        });
      }
    } else if (item.payoutModel === 'fixed') {
      if (item.payoutValue < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'payoutValue deve ser maior ou igual a 0 para valor fixo',
          path: ['payoutValue'],
        });
      }
    }
  });

const expectedRemainderOrder = ['taxes', 'gateway', 'clinic', 'professional', 'platform'] as const;

export const inviteClinicProfessionalSchema = z
  .object({
    tenantId: z.string().uuid(),
    professionalId: z.string().uuid().optional(),
    email: z.string().email().optional(),
    channel: z.enum(['email', 'whatsapp']),
    economicSummary: z
      .object({
        items: z.array(invitationEconomicItemSchema).min(1),
        orderOfRemainders: z
          .array(z.enum(expectedRemainderOrder))
          .length(expectedRemainderOrder.length),
        roundingStrategy: z.literal('half_even'),
      })
      .superRefine((summary, ctx) => {
        const seen = new Set<string>();
        for (const [index, item] of summary.items.entries()) {
          if (seen.has(item.serviceTypeId)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Tipos de servico duplicados no resumo economico',
              path: ['items', index, 'serviceTypeId'],
            });
          }
          seen.add(item.serviceTypeId);
        }

        const mismatched = expectedRemainderOrder.some(
          (recipient, index) => summary.orderOfRemainders[index] !== recipient,
        );

        if (mismatched) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              'orderOfRemainders deve seguir impostos>gateway>clinica>profissional>plataforma',
            path: ['orderOfRemainders'],
          });
        }
      }),
    expiresAt: z.string().datetime(),
    metadata: z.record(z.unknown()).optional(),
  })
  .superRefine((input, ctx) => {
    if (!input.professionalId && !input.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe professionalId ou email para emitir o convite',
        path: ['professionalId'],
      });
    }
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
    .preprocess(
      (value) => {
        if (!value) return undefined;
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
          return value.split(',').map((item) => item.trim());
        }
        return undefined;
      },
      z.array(z.enum(['pending', 'accepted', 'declined', 'revoked', 'expired'])).optional(),
    )
    .optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export type ListClinicInvitationsSchema = z.infer<typeof listClinicInvitationsSchema>;
