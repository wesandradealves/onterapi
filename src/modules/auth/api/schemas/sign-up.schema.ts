import { z } from 'zod';
import { cpfSchema, passwordSchema, phoneSchema } from '@shared/validators/auth.validators';
import { RolesEnum, CLINIC_ROLES, PUBLIC_ROLES } from '@domain/auth/enums/roles.enum';

const allowedSignUpRoles = [...CLINIC_ROLES, ...PUBLIC_ROLES];

export const signUpInputSchema = z.object({
  email: z.string().email('Email inválido'),
  password: passwordSchema,
  name: z.string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras'),
  cpf: cpfSchema,
  phone: phoneSchema.optional(),
  role: z.nativeEnum(RolesEnum)
    .refine(
      (role) => allowedSignUpRoles.includes(role),
      'Role inválida para cadastro'
    ),
  tenantId: z.string().uuid('Tenant ID deve ser um UUID válido').optional(),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'Você deve aceitar os termos de uso' }),
  }),
})
.refine(
  (data) => {
    const clinicRoles = [
      RolesEnum.CLINIC_OWNER,
      RolesEnum.PROFESSIONAL,
      RolesEnum.SECRETARY,
      RolesEnum.MANAGER,
    ];
    
    if (clinicRoles.includes(data.role) && !data.tenantId) {
      return false;
    }
    return true;
  },
  {
    message: 'Usuários de clínica precisam de um tenant ID',
    path: ['tenantId'],
  }
);

export const signUpOutputSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  requiresEmailVerification: z.boolean(),
});

export type SignUpInputDTO = z.infer<typeof signUpInputSchema>;
export type SignUpOutputDTO = z.infer<typeof signUpOutputSchema>;