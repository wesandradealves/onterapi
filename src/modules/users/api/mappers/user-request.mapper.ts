import { ICurrentUser } from '../../../../domain/auth/interfaces/current-user.interface';
import {
  CreateUserCommand,
  IUpdateUser,
  IUserFilters,
} from '../../../../domain/users/types/user.types';
import { CreateUserSchemaType } from '../schemas/create-user.schema';
import { UpdateUserSchemaType } from '../schemas/update-user.schema';
import { ListUsersSchema } from '../schemas/list-users.schema';

export interface UserRequestContext {
  currentUser?: Pick<ICurrentUser, 'tenantId'> | null;
}

export const toCreateUserCommand = (
  dto: CreateUserSchemaType,
): CreateUserCommand => ({
  email: dto.email,
  password: dto.password,
  name: dto.name,
  cpf: dto.cpf,
  phone: dto.phone,
  role: dto.role,
  tenantId: dto.tenantId,
});

export const toUpdateUserInput = (
  dto: UpdateUserSchemaType,
): IUpdateUser => ({
  name: dto.name,
  phone: dto.phone,
  isActive: dto.isActive,
  metadata: dto.metadata,
});

export const toUserFilters = (
  schema: ListUsersSchema,
  context?: UserRequestContext,
): IUserFilters => {
  const filters: IUserFilters = {
    page: schema.page,
    limit: schema.limit,
    role: schema.role,
    tenantId: schema.tenantId,
    isActive: schema.isActive,
  };

  if (!filters.tenantId && context?.currentUser?.tenantId) {
    filters.tenantId = context.currentUser.tenantId;
  }

  return filters;
};
