import { z } from 'zod';

export const signInInputSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
  rememberMe: z.boolean().default(false),
  deviceInfo: z.object({
    userAgent: z.string().optional(),
    ip: z.string().optional(),
    device: z.string().optional(),
  }).optional(),
});

export const signInOutputSchema = z.object({
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  expiresIn: z.number().optional(),
  requiresTwoFactor: z.boolean().optional(),
  tempToken: z.string().optional(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string(),
    role: z.string(),
    tenantId: z.string().uuid().optional(),
  }).optional(),
});

export type SignInInputDTO = z.infer<typeof signInInputSchema>;
export type SignInOutputDTO = z.infer<typeof signInOutputSchema>;