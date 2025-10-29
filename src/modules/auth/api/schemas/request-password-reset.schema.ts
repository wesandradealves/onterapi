import { z } from 'zod';
import { emailSchema } from '../../../../shared/validators/auth.validators';

export const requestPasswordResetSchema = z.object({
  email: emailSchema,
});

export type RequestPasswordResetSchemaType = z.infer<typeof requestPasswordResetSchema>;
