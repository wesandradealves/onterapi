import { z } from 'zod';

export const signOutSchema = z
  .object({
    refreshToken: z.string().trim().min(1).optional(),
    allDevices: z.boolean().optional(),
  })
  .default({});

export type SignOutSchemaType = z.infer<typeof signOutSchema>;
