import { z } from 'zod';

export const reviewClinicOverbookingSchema = z
  .object({
    tenantId: z.string().uuid({ message: 'Tenant ID invalido' }).optional(),
    approve: z.boolean(),
    justification: z
      .string()
      .trim()
      .min(3, { message: 'Justificativa deve conter ao menos 3 caracteres' })
      .max(500, { message: 'Justificativa deve conter no maximo 500 caracteres' })
      .optional()
      .nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.approve === false && (!data.justification || data.justification.trim().length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['justification'],
        message: 'Justificativa obrigatoria quando o overbooking e rejeitado',
      });
    }
  });

export type ReviewClinicOverbookingSchema = z.infer<typeof reviewClinicOverbookingSchema>;
