import { z } from 'zod';
import { RolesEnum } from '../../../../domain/auth/enums/roles.enum';
import {
  passwordValidator,
  cpfValidator,
  phoneValidator,
} from '../../../../shared/validators/auth.validators';

// Lista de roles válidos
const validRoles = Object.values(RolesEnum);

export const createUserSchema = z.object({
  email: z.string().email('Email inválido'),
  password: passwordValidator,
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(255),
  cpf: cpfValidator,
  phone: phoneValidator.optional(),
  role: z.string().refine(
    (val) => validRoles.includes(val as RolesEnum),
    {
      message: `Role inválido. Valores permitidos: ${validRoles.join(', ')}`,
    }
  ).transform((val) => val as RolesEnum),
  tenantId: z.string().uuid('ID do tenant deve ser um UUID válido').optional(),
});

export type CreateUserSchemaType = z.infer<typeof createUserSchema>;