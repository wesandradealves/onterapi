import { RequestPasswordResetUseCase } from '@modules/auth/use-cases/request-password-reset.use-case';
import { IAuthRepository } from '@domain/auth/interfaces/repositories/auth.repository.interface';
import { ISupabaseAuthService } from '@domain/auth/interfaces/services/supabase-auth.service.interface';
import { IEmailService } from '@domain/auth/interfaces/services/email.service.interface';
import { MessageBus } from '@shared/messaging/message-bus';

describe('RequestPasswordResetUseCase', () => {
  const buildUseCase = () => {
    const authRepository = {
      findByEmail: jest.fn(),
    } as unknown as IAuthRepository;

    const supabaseAuthService = {
      generatePasswordResetLink: jest.fn(),
    } as unknown as ISupabaseAuthService;

    const emailService = {
      sendPasswordResetEmail: jest.fn(),
    } as unknown as IEmailService;

    const messageBus = {
      publish: jest.fn(),
    } as unknown as MessageBus;

    const useCase = new RequestPasswordResetUseCase(
      authRepository,
      supabaseAuthService,
      emailService,
      messageBus,
    );

    return { useCase, authRepository, supabaseAuthService, emailService, messageBus };
  };

  it('retorna delivered false quando usuario nao existe', async () => {
    const { useCase, authRepository } = buildUseCase();
    (authRepository.findByEmail as jest.Mock).mockResolvedValue(null);

    const result = await useCase.execute({ email: 'nope@example.com' });

    expect(result.data).toMatchObject({ delivered: false });
    expect(result.data?.message).toContain('Se o email estiver cadastrado');
  });

  it('gera link e envia email quando usuario existe', async () => {
    const { useCase, authRepository, supabaseAuthService, emailService, messageBus } =
      buildUseCase();

    (authRepository.findByEmail as jest.Mock).mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: 'User Test',
      tenantId: 'tenant-1',
    });

    (supabaseAuthService.generatePasswordResetLink as jest.Mock).mockResolvedValue({
      data: { actionLink: 'https://app/reset', hashedToken: 'hash-token' },
    });

    (emailService.sendPasswordResetEmail as jest.Mock).mockResolvedValue({ data: undefined });

    const result = await useCase.execute({ email: 'user@example.com', requesterIp: '10.0.0.1' });

    expect(result.data).toEqual({
      delivered: true,
      message: expect.any(String),
    });
    expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith({
      to: 'user@example.com',
      name: 'User Test',
      resetLink: 'https://app/reset',
      expiresIn: expect.stringContaining('minutos'),
    });
    expect(messageBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'auth.password.reset_requested',
        aggregateId: 'user-1',
      }),
    );
  });

  it('retorna erro quando envio de email falha', async () => {
    const { useCase, authRepository, supabaseAuthService, emailService } = buildUseCase();

    (authRepository.findByEmail as jest.Mock).mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: 'User Test',
      tenantId: 'tenant-1',
    });

    (supabaseAuthService.generatePasswordResetLink as jest.Mock).mockResolvedValue({
      data: { actionLink: 'https://app/reset' },
    });

    (emailService.sendPasswordResetEmail as jest.Mock).mockResolvedValue({
      error: new Error('fail'),
    });

    await expect(useCase.execute({ email: 'user@example.com' })).rejects.toBeDefined();
  });
});
