import { z } from 'zod';

import { CPFValidator } from '../../../../shared/validators/cpf.validator';

export const completeClinicInvitationOnboardingSchema = z
  .object({
    tenantId: z.string().uuid(),
    token: z.string().min(10),
    name: z.string().min(3).max(120),
    cpf: z
      .string()
      .min(11)
      .max(14)
      .transform((value) => CPFValidator.clean(value)),
    phone: z
      .string()
      .max(20)
      .optional()
      .transform((value) => value?.trim() ?? undefined),
    password: z.string().min(8).max(128),
    passwordConfirmation: z.string().min(8).max(128),
  })
  .superRefine((data, ctx) => {
    if (!CPFValidator.isValid(data.cpf)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CPF invalido',
        path: ['cpf'],
      });
    }

    if (data.password !== data.passwordConfirmation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Senha e confirmacao devem ser iguais',
        path: ['passwordConfirmation'],
      });
    }
  })
  .transform((data) => ({
    tenantId: data.tenantId,
    token: data.token,
    name: data.name.trim(),
    cpf: data.cpf,
    phone: data.phone,
    password: data.password,
  }));

export type CompleteClinicInvitationOnboardingSchema = z.infer<
  typeof completeClinicInvitationOnboardingSchema
>;
