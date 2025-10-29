import {
  toCreateUserCommand,
  toUpdateUserInput,
  toUserFilters,
} from '@modules/users/api/mappers/user-request.mapper';
import { CreateUserSchemaType } from '@modules/users/api/schemas/create-user.schema';
import { UpdateUserSchemaType } from '@modules/users/api/schemas/update-user.schema';
import { ListUsersSchema } from '@modules/users/api/schemas/list-users.schema';
import { RolesEnum } from '@domain/auth/enums/roles.enum';

describe('user-request.mapper', () => {
  it('converte CreateUserSchemaType em CreateUserCommand preservando tenant explicito', () => {
    const payload: CreateUserSchemaType = {
      email: 'ana@example.com',
      password: 'SenhaForte123!',
      name: 'Ana Souza',
      cpf: '12345678901',
      phone: '11999990000',
      role: RolesEnum.SECRETARY,
      tenantId: 'tenant-123',
    };

    const result = toCreateUserCommand(payload);

    expect(result).toEqual({
      email: payload.email,
      password: payload.password,
      name: payload.name,
      cpf: payload.cpf,
      phone: payload.phone,
      role: payload.role,
      tenantId: payload.tenantId,
    });
  });

  it('normaliza UpdateUserSchemaType em IUpdateUser com metadata opcional', () => {
    const payload: UpdateUserSchemaType = {
      name: 'Ana Atualizada',
      phone: '11911112222',
      isActive: false,
      metadata: {
        locale: 'pt-BR',
        theme: 'dark',
      },
    };

    const result = toUpdateUserInput(payload);

    expect(result).toEqual({
      name: payload.name,
      phone: payload.phone,
      isActive: payload.isActive,
      metadata: payload.metadata,
    });
  });

  it('preenche tenantId ausente a partir do contexto atual', () => {
    const filters: ListUsersSchema = {
      page: 2,
      limit: 30,
      role: RolesEnum.PATIENT,
      tenantId: undefined,
      isActive: true,
    };

    const currentUser = { tenantId: 'tenant-from-context' };

    const result = toUserFilters(filters, { currentUser });

    expect(result).toEqual({
      page: filters.page,
      limit: filters.limit,
      role: filters.role,
      tenantId: currentUser.tenantId,
      isActive: filters.isActive,
    });
  });

  it('mant m tenantId informado no filtro mesmo com contexto presente', () => {
    const filters: ListUsersSchema = {
      page: 1,
      limit: 10,
      role: RolesEnum.SUPER_ADMIN,
      tenantId: 'tenant-explicito',
      isActive: undefined,
    };

    const currentUser = { tenantId: 'tenant-contexto' };

    const result = toUserFilters(filters, { currentUser });

    expect(result).toEqual({
      page: filters.page,
      limit: filters.limit,
      role: filters.role,
      tenantId: 'tenant-explicito',
      isActive: filters.isActive,
    });
  });

  it('retorna filtros sem tenant quando contexto ausente', () => {
    const filters: ListUsersSchema = {
      page: undefined,
      limit: undefined,
      role: undefined,
      tenantId: undefined,
      isActive: undefined,
    };

    const result = toUserFilters(filters);

    expect(result).toEqual({
      page: undefined,
      limit: undefined,
      role: undefined,
      tenantId: undefined,
      isActive: undefined,
    });
  });
});
