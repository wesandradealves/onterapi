import { ExecutionContext } from '@nestjs/common';
import { UserOwnerGuard } from '@modules/users/guards/user-owner.guard';
import { RolesEnum } from '@domain/auth/enums/roles.enum';
import { MESSAGES } from '@shared/constants/messages.constants';

describe('UserOwnerGuard', () => {
  const buildContext = (
    user: any,
    params: Record<string, string | undefined>,
  ): ExecutionContext => ({
    switchToHttp: () => ({
      getRequest: () => ({ params, user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  }) as unknown as ExecutionContext;

  const guard = new UserOwnerGuard();

  it('permite acesso para roles administrativas', () => {
    const context = buildContext({ role: RolesEnum.SUPER_ADMIN }, { slug: 'any' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('permite acesso quando userId corresponde', () => {
    const context = buildContext(
      { id: 'user-1', role: RolesEnum.PROFESSIONAL },
      { id: 'user-1' },
    );
    expect(guard.canActivate(context)).toBe(true);
  });

  it('permite acesso quando slug corresponde', () => {
    const context = buildContext(
      { metadata: { slug: 'user-slug' }, role: RolesEnum.PROFESSIONAL },
      { slug: 'user-slug' },
    );
    expect(guard.canActivate(context)).toBe(true);
  });

  it('lança quando não possui permissão', () => {
    const context = buildContext(
      { id: 'user-1', metadata: { slug: 'user-slug' }, role: RolesEnum.PROFESSIONAL, email: 'u@example.com' },
      { slug: 'other-slug' },
    );
    expect(() => guard.canActivate(context)).toThrowError(MESSAGES.GUARDS.ACCESS_DENIED_OWN_DATA);
  });
});
