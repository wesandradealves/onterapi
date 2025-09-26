import { ConfirmPasswordResetUseCase } from '@modules/auth/use-cases/confirm-password-reset.use-case';
import { IAuthRepository } from '@domain/auth/interfaces/repositories/auth.repository.interface';
import { ISupabaseAuthService } from '@domain/auth/interfaces/services/supabase-auth.service.interface';
import { IEmailService } from '@domain/auth/interfaces/services/email.service.interface';
import { MessageBus } from '@shared/messaging/message-bus';

const buildSupabaseUser = () => ({
  id: 'supabase-1',
  email: 'user@example.com',
  emailVerified: true,
  metadata: { name: 'User Meta' },
});

describe('ConfirmPasswordResetUseCase', () => {
  const buildUseCase = () => {
    const authRepository = {
      findBySupabaseId: jest.fn(),
      update: jest.fn(),
    } as unknown as IAuthRepository;

    const supabaseAuthService = {
      getUser: jest.fn(),
      updatePassword: jest.fn(),
    } as unknown as ISupabaseAuthService;

    const emailService = {
      sendPasswordChangedEmail: jest.fn().mockResolvedValue({ data: undefined }),
    } as unknown as IEmailService;

    const messageBus = {
      publish: jest.fn(),
    } as unknown as MessageBus;

    const useCase = new ConfirmPasswordResetUseCase(
      authRepository,
      supabaseAuthService,
      emailService,
      messageBus,
    );

    return { useCase, authRepository, supabaseAuthService, emailService, messageBus };
  };

  it('atualiza usuario local e publica evento quando sucesso', async () => {
    const { useCase, authRepository, supabaseAuthService, emailService, messageBus } =
      buildUseCase();

    (supabaseAuthService.getUser as jest.Mock).mockResolvedValue({ data: buildSupabaseUser() });
    (supabaseAuthService.updatePassword as jest.Mock).mockResolvedValue({ data: undefined });
    (authRepository.findBySupabaseId as jest.Mock).mockResolvedValue({
      id: 'user-1',
      emailVerified: false,
      metadata: {},
      name: 'Local User',
      tenantId: 'tenant-1',
    });

    const result = await useCase.execute({
      accessToken: 'token',
      newPassword: 'NovaSenha123!',
    });

    expect(result.data).toEqual({ success: true, message: expect.any(String) });
    expect(authRepository.update).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ emailVerified: true }),
    );
    expect(emailService.sendPasswordChangedEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'user@example.com' }),
    );
    expect(messageBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'auth.password.reset_completed',
        aggregateId: 'user-1',
      }),
    );
  });

  it('mantem fluxo quando usuario local nao existe', async () => {
    const { useCase, authRepository, supabaseAuthService, emailService, messageBus } =
      buildUseCase();

    (supabaseAuthService.getUser as jest.Mock).mockResolvedValue({ data: buildSupabaseUser() });
    (supabaseAuthService.updatePassword as jest.Mock).mockResolvedValue({ data: undefined });
    (authRepository.findBySupabaseId as jest.Mock).mockResolvedValue(null);

    const result = await useCase.execute({ accessToken: 'token', newPassword: 'OutraSenha123!' });

    expect(result.data).toEqual({ success: true, message: expect.any(String) });
    expect(authRepository.update).not.toHaveBeenCalled();
    expect(emailService.sendPasswordChangedEmail).toHaveBeenCalled();
    expect(messageBus.publish).not.toHaveBeenCalled();
  });

  it('retorna erro quando updatePassword falha', async () => {
    const { useCase, supabaseAuthService } = buildUseCase();

    (supabaseAuthService.getUser as jest.Mock).mockResolvedValue({ data: buildSupabaseUser() });
    (supabaseAuthService.updatePassword as jest.Mock).mockResolvedValue({
      error: new Error('fail'),
    });

    const result = await useCase.execute({ accessToken: 'token', newPassword: 'Senha123!' });

    expect(result.error).toBeDefined();
  });

  it('retorna erro quando token de acesso e invalido', async () => {
    const { useCase, supabaseAuthService } = buildUseCase();

    (supabaseAuthService.getUser as jest.Mock).mockResolvedValue({ error: new Error('invalid') });

    const result = await useCase.execute({ accessToken: 'token', newPassword: 'Senha123!' });

    expect(result.error).toBeDefined();
  });
});
