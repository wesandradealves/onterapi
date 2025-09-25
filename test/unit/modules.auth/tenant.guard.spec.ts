import { TenantGuard } from '@modules/auth/guards/tenant.guard';
import { RolesEnum } from '@domain/auth/enums/roles.enum';

describe('TenantGuard', () => {
  let guard: TenantGuard;

  const buildContext = (user: any, requestOverride: any = {}) => ({
    switchToHttp: () => ({
      getRequest: () => ({ user, ...requestOverride }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  }) as any;

  beforeEach(() => {
    guard = new TenantGuard({} as any);
  });

  it('permite quando usuário interno', () => {
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

  it('lança quando tenant diferente', () => {
    const context = buildContext(
      { role: RolesEnum.PROFESSIONAL, tenantId: 'tenant-1', email: 'u@example.com' },
      { headers: { 'x-tenant-id': 'tenant-2' } },
    );
    expect(() => guard.canActivate(context)).toThrow(/tenant/);
  });
});
