import { ActiveAccountGuard } from '@modules/auth/guards/active-account.guard';

describe('ActiveAccountGuard', () => {
  const guard = new ActiveAccountGuard();

  const buildContext = (user: any) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as any;

  it('permite acesso quando conta ativa', async () => {
    await expect(guard.canActivate(buildContext({ isActive: true }))).resolves.toBe(true);
  });

  it('bloqueia conta desativada', async () => {
    await expect(guard.canActivate(buildContext({ isActive: false }))).rejects.toThrow(
      'Conta desativada',
    );
  });

  it('bloqueia conta banida ate data futura', async () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    await expect(
      guard.canActivate(buildContext({ isActive: true, bannedUntil: future })),
    ).rejects.toThrow('Conta bloqueada temporariamente');
  });
});
