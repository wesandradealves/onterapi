import { ResendVerificationEmailUseCase } from '@modules/auth/use-cases/resend-verification-email.use-case';
import { IAuthRepository } from '@domain/auth/interfaces/repositories/auth.repository.interface';
import { ISupabaseAuthService } from '@domain/auth/interfaces/services/supabase-auth.service.interface';
import { IEmailService } from '@domain/auth/interfaces/services/email.service.interface';
import { MessageBus } from '@shared/messaging/message-bus';
import { BadRequestException } from '@nestjs/common';

describe('ResendVerificationEmailUseCase', () => {
  const buildUseCase = () => {
    const authRepository = {
      findByEmail: jest.fn(),
      update: jest.fn(),
    } as unknown as IAuthRepository;

    const supabaseAuthService = {
      generateVerificationLink: jest.fn(),
    } as unknown as ISupabaseAuthService;

    const emailService = {
      sendVerificationEmail: jest.fn(),
    } as unknown as IEmailService;

    const messageBus = {
      publish: jest.fn(),
    } as unknown as MessageBus;

    const useCase = new ResendVerificationEmailUseCase(
      authRepository,
      supabaseAuthService,
      emailService,
      messageBus,
    );

    return { useCase, authRepository, supabaseAuthService, emailService, messageBus };
  };

  it('retorna delivered false quando usuario nao existe', async () => {
    const { useCase, authRepository, emailService } = buildUseCase();
    (authRepository.findByEmail as jest.Mock).mockResolvedValue(null);

    const result = await useCase.execute({ email: 'ghost@example.com' });

    expect(result.data).toMatchObject({
      delivered: false,
      alreadyVerified: false,
    });
    expect(result.data?.message).toContain('Se o email estiver cadastrado');
    expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
  });

  it('retorna alreadyVerified true quando email ja foi confirmado', async () => {
    const { useCase, authRepository } = buildUseCase();
    (authRepository.findByEmail as jest.Mock).mockResolvedValue({
      id: 'user-1',
      email: 'verified@example.com',
      emailVerified: true,
    });

    const result = await useCase.execute({ email: 'verified@example.com' });

    expect(result.data).toMatchObject({
      delivered: false,
      alreadyVerified: true,
    });
    expect(result.data?.message).toContain('Este email');
    expect(result.data?.message).toContain('login');
  });

  it('envia email de verificacao e atualiza repositorio quando sucesso', async () => {
    const { useCase, authRepository, supabaseAuthService, emailService, messageBus } =
      buildUseCase();

    (authRepository.findByEmail as jest.Mock).mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      emailVerified: false,
      name: 'User Test',
      tenantId: 'tenant-1',
    });

    (supabaseAuthService.generateVerificationLink as jest.Mock).mockResolvedValue({
      data: { actionLink: 'https://app/verify', hashedToken: 'hash-token' },
    });

    (emailService.sendVerificationEmail as jest.Mock).mockResolvedValue({ data: undefined });

    const result = await useCase.execute({ email: 'user@example.com', requesterIp: '10.0.0.1' });

    expect(result.data).toEqual({
      delivered: true,
      alreadyVerified: false,
      message: expect.any(String),
    });
    expect(authRepository.update).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        emailVerificationToken: 'hash-token',
      }),
    );
    expect(emailService.sendVerificationEmail).toHaveBeenCalledWith({
      to: 'user@example.com',
      name: 'User Test',
      verificationLink: 'https://app/verify',
      expiresIn: expect.stringContaining('minutos'),
    });
    expect(messageBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: 'auth.email.resent', aggregateId: 'user-1' }),
    );
  });

  it('retorna erro quando supabase nao gera link', async () => {
    const { useCase, authRepository, supabaseAuthService } = buildUseCase();

    (authRepository.findByEmail as jest.Mock).mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      emailVerified: false,
      name: 'User',
      tenantId: 'tenant-1',
    });

    (supabaseAuthService.generateVerificationLink as jest.Mock).mockResolvedValue({
      error: new Error('fail'),
    });

    await expect(useCase.execute({ email: 'user@example.com' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
