import { z } from 'zod';
import { RolesEnum } from '../../../../domain/auth/enums/roles.enum';
import {
  cpfValidator,
  passwordValidator,
  phoneValidator,
} from '../../../../shared/validators/auth.validators';
import { mapRoleToDomain } from '../../../../shared/utils/role.utils';

const validRoles = Object.values(RolesEnum);

export const createUserSchema = z.object({
  email: z.string().email('Email invalido'),
  password: passwordValidator,
  name: z.string().min(3, 'Nome deve ter no minimo 3 caracteres').max(255),
  cpf: cpfValidator,
  phone: phoneValidator.optional(),
  role: z.string().transform((val, ctx) => {
    const normalized = String(val).trim();
    const mapped = mapRoleToDomain(normalized);

    if (!mapped) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Role invalida. Valores permitidos: ${validRoles.join(', ')}`,
      });
      return z.NEVER;
    }

    return mapped;
  }),
  tenantId: z.string().uuid('ID do tenant deve ser um UUID valido').optional(),
});

export type CreateUserSchemaType = z.infer<typeof createUserSchema>;
