import { UserPresenter } from '@modules/users/api/presenters/user.presenter';
import { UserEntity } from '@infrastructure/auth/entities/user.entity';

describe('UserPresenter', () => {
  const buildUser = (overrides: Partial<UserEntity> = {}): UserEntity => ({
    id: 'user-id',
    supabaseId: 'user-id',
    slug: 'user-slug',
    email: 'user@example.com',
    name: 'User Name',
    cpf: '12345678901',
    phone: '11988889999',
    role: 'SUPER_ADMIN',
    tenantId: 'tenant-id',
    isActive: true,
    emailVerified: true,
    twoFactorEnabled: false,
    lastLoginAt: null,
    createdAt: new Date('2025-09-25T09:00:00.000Z'),
    updatedAt: new Date('2025-09-25T09:10:00.000Z'),
    metadata: {},
    deletedAt: null,
    ...overrides,
  });

  it('mascara CPF por padrao', () => {
    const result = UserPresenter.toResponse(buildUser());
    expect(result.cpf).toBe('123.***.***.01');
  });

  it('permite exibir CPF sem mascara para cenarios especificos', () => {
    const result = UserPresenter.toResponse(buildUser(), false);
    expect(result.cpf).toBe('12345678901');
  });

  it('reutiliza response para create', () => {
    const response = UserPresenter.toCreateResponse(buildUser());
    expect(response).toMatchObject({
      id: 'user-id',
      name: 'User Name',
      role: 'SUPER_ADMIN',
    });
  });
});
