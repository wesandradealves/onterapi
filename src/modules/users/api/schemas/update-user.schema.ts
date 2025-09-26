import { z } from 'zod';
import { phoneValidator } from '../../../../shared/validators/auth.validators';

export const updateUserSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(255).optional(),
  phone: phoneValidator.optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
});

export type UpdateUserSchemaType = z.infer<typeof updateUserSchema>;
