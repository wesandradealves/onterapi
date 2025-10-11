import { TenantGuard } from '@modules/auth/guards/tenant.guard';
import { RolesEnum } from '@domain/auth/enums/roles.enum';

describe('TenantGuard', () => {
  let guard: TenantGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  const buildContext = (user: any, requestOverride: any = {}) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user, ...requestOverride }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as any;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn(() => false) };
    guard = new TenantGuard(reflector as any);
  });

  it('permite rota publica sem validar tenant', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(true);
    const context = buildContext(undefined, {});

    expect(guard.canActivate(context)).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalled();
  });

  it('permite quando usuario interno', () => {
    const context = buildContext({ role: RolesEnum.SUPER_ADMIN });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('permite quando tenant coincide', () => {
    const context = buildContext(
      { role: RolesEnum.PROFESSIONAL, tenantId: 'tenant-1' },
      { headers: { 'x-tenant-id': 'tenant-1' } },
    );

    expect(guard.canActivate(context)).toBe(true);
  });

  it('lanca quando tenant diferente', () => {
    const context = buildContext(
      { role: RolesEnum.PROFESSIONAL, tenantId: 'tenant-1', email: 'user@example.com' },
      { headers: { 'x-tenant-id': 'tenant-2' } },
    );

    expect(() => guard.canActivate(context)).toThrow(/tenant/);
  });
});
