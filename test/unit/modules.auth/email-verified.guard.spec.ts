import { EmailVerifiedGuard } from '@modules/auth/guards/email-verified.guard';
import { Reflector } from '@nestjs/core';
import { AUTH_MESSAGES } from '@shared/constants/auth.constants';

describe('EmailVerifiedGuard', () => {
  let reflector: jest.Mocked<Reflector>;
  let guard: EmailVerifiedGuard;

  const buildContext = (user: any) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as any;

  beforeEach(() => {
    reflector = {
      get: jest.fn(),
      getAll: jest.fn(),
      getAllAndMerge: jest.fn(),
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
    guard = new EmailVerifiedGuard(reflector);
  });

  it('permite quando verificacao e opcional', async () => {
    reflector.get.mockReturnValue(true);
    await expect(guard.canActivate(buildContext({ emailVerified: false }))).resolves.toBe(true);
  });

  it('permite quando usuario verificado', async () => {
    reflector.get.mockReturnValue(false);
    await expect(guard.canActivate(buildContext({ emailVerified: true }))).resolves.toBe(true);
  });

  it('bloqueia quando usuario nao verificado', async () => {
    reflector.get.mockReturnValue(false);
    await expect(
      guard.canActivate(buildContext({ emailVerified: false, id: '1', email: 'u@example.com' })),
    ).rejects.toThrow(AUTH_MESSAGES.ERRORS.EMAIL_NOT_VERIFIED);
  });
});
