import { z } from 'zod';

export const validateTwoFAInputSchema = z.object({
  tempToken: z.string().min(1, 'Token temporário é obrigatório'),
  code: z.string()
    .length(6, 'Código deve ter 6 dígitos')
    .regex(/^\d{6}$/, 'Código deve conter apenas números'),
  trustDevice: z.boolean().default(false),
  deviceInfo: z.object({
    userAgent: z.string().optional(),
    ip: z.string().optional(),
    device: z.string().optional(),
  }).optional(),
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