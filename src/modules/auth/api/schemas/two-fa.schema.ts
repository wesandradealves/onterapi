import { z } from 'zod';

export const validateTwoFAInputSchema = z.object({
  tempToken: z.string().min(1, 'Token tempor rio   obrigat rio'),
  code: z
    .string()
    .length(6, 'C digo deve ter 6 d gitos')
    .regex(/^\d{6}$/, 'C digo deve conter apenas n meros'),
  trustDevice: z.boolean().default(false),
  deviceInfo: z
    .object({
      userAgent: z.string().optional(),
      ip: z.string().optional(),
      device: z.string().optional(),
    })
    .optional(),
});

export const validateTwoFAOutputSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string(),
    role: z.string(),
    tenantId: z.string().uuid().optional(),
  }),
});

export type ValidateTwoFAInputDTO = z.infer<typeof validateTwoFAInputSchema>;
export type ValidateTwoFAOutputDTO = z.infer<typeof validateTwoFAOutputSchema>;
export const sendTwoFAInputSchema = z.object({
  tempToken: z.string().min(1, 'Token tempor rio   obrigat rio'),
  method: z.enum(['email', 'sms']).default('email'),
});

export type SendTwoFAInputDTO = z.infer<typeof sendTwoFAInputSchema>;
