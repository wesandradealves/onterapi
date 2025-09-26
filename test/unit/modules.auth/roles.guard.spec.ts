import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { RolesEnum } from '@domain/auth/enums/roles.enum';
import { Reflector } from '@nestjs/core';

describe('RolesGuard', () => {
  let reflector: jest.Mocked<Reflector>;
  let guard: RolesGuard;

  const buildContext = (user: any) => ({
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  }) as any;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;
    guard = new RolesGuard(reflector);
  });

  it('permite acesso quando handler não especifica roles', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(buildContext({ role: RolesEnum.PROFESSIONAL }))).toBe(true);
  });

  it('permite acesso quando role está autorizada', () => {
    reflector.getAllAndOverride.mockReturnValue([RolesEnum.SUPER_ADMIN]);
    const context = buildContext({ role: RolesEnum.SUPER_ADMIN });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('bloqueia acesso para role não autorizada', () => {
    reflector.getAllAndOverride.mockReturnValue([RolesEnum.SUPER_ADMIN]);
    const context = buildContext({ role: RolesEnum.PROFESSIONAL, email: 'u@example.com' });
    expect(() => guard.canActivate(context)).toThrow(/insuficiente/);
  });
});
