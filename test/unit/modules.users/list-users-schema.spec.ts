import { ZodError } from 'zod';
import { RolesEnum } from '@domain/auth/enums/roles.enum';
import { listUsersSchema } from '@modules/users/api/schemas/list-users.schema';

describe('listUsersSchema', () => {
  it('normalizes numeric and boolean filters', () => {
    const result = listUsersSchema.parse({
      page: '2',
      limit: '50',
      isActive: 'false',
    });

    expect(result).toEqual({ page: 2, limit: 50, isActive: false });
  });

  it('maps role inputs to RolesEnum', () => {
    const result = listUsersSchema.parse({ role: 'super_admin' });

    expect(result.role).toBe(RolesEnum.SUPER_ADMIN);
  });

  it('strips empty strings from optional fields', () => {
    const result = listUsersSchema.parse({ tenantId: '   ' });

    expect(result).toEqual({});
  });

  it('rejects invalid roles', () => {
    expect(() => listUsersSchema.parse({ role: 'invalid-role' })).toThrow(ZodError);
  });
});
