import { z } from 'zod';
import { emailSchema } from '../../../../shared/validators/auth.validators';

export const resendVerificationEmailSchema = z.object({
  email: emailSchema,
});

export type ResendVerificationEmailSchemaType = z.infer<typeof resendVerificationEmailSchema>;
