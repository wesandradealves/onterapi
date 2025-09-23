import { z } from 'zod';
import { emailSchema, passwordSchema } from '../validators/auth.validators';

export const deviceInfoSchema = z
  .object({
    userAgent: z.string().optional(),
    ip: z.string().optional(),
    device: z.string().optional(),
    location: z.string().optional(),
    trustedDevice: z.boolean().optional(),
  })
  .optional();

export const userResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().optional(),
  role: z.string().optional(),
  tenantId: z.string().nullable().optional(),
});

export const tokenResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
  user: userResponseSchema,
});

export const twoFactorTempResponseSchema = z.object({
  requiresTwoFactor: z.boolean(),
  tempToken: z.string(),
});

export const twoFactorSendResponseSchema = z.object({
  sentTo: z.string(),
  method: z.enum(['email', 'sms']),
  expiresIn: z.number(),
  attemptsRemaining: z.number(),
});

export const signInInputSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  rememberMe: z.boolean().default(false),
  deviceInfo: deviceInfoSchema,
});

export const twoFactorValidateInputSchema = z.object({
  tempToken: z.string(),
  code: z.string().length(6),
  trustDevice: z.boolean().default(false),
  deviceInfo: deviceInfoSchema,
});

export const refreshTokenInputSchema = z.object({
  refreshToken: z.string(),
  deviceInfo: deviceInfoSchema,
});

export const signOutInputSchema = z.object({
  refreshToken: z.string().optional(),
  allDevices: z.boolean().default(false),
});

export type DeviceInfo = z.infer<typeof deviceInfoSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
export type TokenResponse = z.infer<typeof tokenResponseSchema>;
export type TwoFactorTempResponse = z.infer<typeof twoFactorTempResponseSchema>;
export type TwoFactorSendResponse = z.infer<typeof twoFactorSendResponseSchema>;
