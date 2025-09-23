import { z } from 'zod';

export const refreshTokenInputSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token é obrigatório'),
  deviceInfo: z
    .object({
      userAgent: z.string().optional(),
      ip: z.string().optional(),
      device: z.string().optional(),
    })
    .optional(),
});

export const refreshTokenOutputSchema = z.object({
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

export type RefreshTokenInputDTO = z.infer<typeof refreshTokenInputSchema>;
export type RefreshTokenOutputDTO = z.infer<typeof refreshTokenOutputSchema>;
