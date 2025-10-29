import { z } from 'zod';
import { passwordSchema } from '../../../../shared/validators/auth.validators';

export const confirmPasswordResetSchema = z.object({
  accessToken: z.string().min(1, 'Token de acesso   obrigat rio'),
  newPassword: passwordSchema,
  refreshToken: z.string().optional(),
});

export type ConfirmPasswordResetSchemaType = z.infer<typeof confirmPasswordResetSchema>;
