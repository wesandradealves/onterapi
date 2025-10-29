import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AuthController } from '@modules/auth/api/controllers/auth.controller';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import {
  ISignInUseCase,
  SignInInput,
  SignInOutput,
} from '@domain/auth/interfaces/use-cases/sign-in.use-case.interface';
import {
  IRefreshTokenUseCase,
  RefreshTokenInput,
  RefreshTokenOutput,
} from '@domain/auth/interfaces/use-cases/refresh-token.use-case.interface';
import {
  ISignOutUseCase,
  SignOutInput,
  SignOutOutput,
} from '@domain/auth/interfaces/use-cases/sign-out.use-case.interface';
import {
  IResendVerificationEmailUseCase,
  ResendVerificationEmailInput,
  ResendVerificationEmailOutput,
} from '@domain/auth/interfaces/use-cases/resend-verification-email.use-case.interface';
import {
  IRequestPasswordResetUseCase,
  RequestPasswordResetInput,
  RequestPasswordResetOutput,
} from '@domain/auth/interfaces/use-cases/request-password-reset.use-case.interface';
import {
  ConfirmPasswordResetInput,
  ConfirmPasswordResetOutput,
  IConfirmPasswordResetUseCase,
} from '@domain/auth/interfaces/use-cases/confirm-password-reset.use-case.interface';
import { ISupabaseAuthService } from '@domain/auth/interfaces/services/supabase-auth.service.interface';
import { ICurrentUser } from '@modules/auth/decorators/current-user.decorator';

const createMock = <TInput, TOutput>() => {
  const execute = jest.fn<Promise<{ data?: TOutput; error?: unknown }>, [TInput]>();
  const executeOrThrow = jest.fn<Promise<TOutput>, [TInput]>(async (input: TInput) => {
    const result = await execute(input);

    if (result?.error) {
      throw result.error;
    }

    return result?.data as TOutput;
  });

  return { execute, executeOrThrow };
};

describe('AuthController (integration)', () => {
  let app: INestApplication;

  const currentUser: ICurrentUser = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Usuario',
    role: 'PATIENT',
    tenantId: 'tenant-1',
    sessionId: 'session-1',
    metadata: {},
  } as ICurrentUser;

  const signInUseCase = createMock<SignInInput, SignInOutput>();
  const refreshUseCase = createMock<RefreshTokenInput, RefreshTokenOutput>();
  const signOutUseCase = createMock<SignOutInput, SignOutOutput>();
  const resendVerificationUseCase = createMock<
    ResendVerificationEmailInput,
    ResendVerificationEmailOutput
  >();
  const requestResetUseCase = createMock<RequestPasswordResetInput, RequestPasswordResetOutput>();
  const confirmResetUseCase = createMock<ConfirmPasswordResetInput, ConfirmPasswordResetOutput>();
  const supabaseAuthService = {
    verifyEmail: jest.fn(),
    confirmEmailByEmail: jest.fn(),
  } as unknown as jest.Mocked<ISupabaseAuthService>;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: ISignInUseCase, useValue: signInUseCase },
        { provide: IRefreshTokenUseCase, useValue: refreshUseCase },
        { provide: ISignOutUseCase, useValue: signOutUseCase },
        { provide: IResendVerificationEmailUseCase, useValue: resendVerificationUseCase },
        { provide: IRequestPasswordResetUseCase, useValue: requestResetUseCase },
        { provide: IConfirmPasswordResetUseCase, useValue: confirmResetUseCase },
        { provide: ISupabaseAuthService, useValue: supabaseAuthService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          req.user = currentUser;
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('realiza sign-in delegando ao use case com device info normalizado', async () => {
    signInUseCase.execute.mockResolvedValue({
      data: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 3600,
        user: { id: 'user-1', email: 'user@example.com', name: 'Usuario', role: 'PATIENT' },
      },
    });

    await request(app.getHttpServer())
      .post('/auth/sign-in')
      .set('user-agent', 'jest-agent')
      .send({
        email: 'user@example.com',
        password: 'SenhaForte123!',
        rememberMe: true,
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.accessToken).toBe('access-token');
        expect(body.refreshToken).toBe('refresh-token');
      });

    expect(signInUseCase.execute).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'SenhaForte123!',
      rememberMe: true,
      deviceInfo: expect.objectContaining({ userAgent: 'jest-agent' }),
    });
  });

  it('renova token aplicando mapper de device info', async () => {
    refreshUseCase.execute.mockResolvedValue({
      data: {
        accessToken: 'novo-access',
        refreshToken: 'novo-refresh',
        expiresIn: 7200,
        user: { id: 'user-1', email: 'user@example.com', name: 'Usuario', role: 'PATIENT' },
      },
    });

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('user-agent', 'jest-agent')
      .send({ refreshToken: 'refresh-token' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.accessToken).toBe('novo-access');
      });

    expect(refreshUseCase.execute).toHaveBeenCalledWith({
      refreshToken: 'refresh-token',
      deviceInfo: expect.objectContaining({ userAgent: 'jest-agent' }),
    });
  });

  it('executa sign-out extraindo bearer token e user atual', async () => {
    signOutUseCase.execute.mockResolvedValue({
      data: {
        message: 'Sessoes revogadas',
        revokedSessions: 1,
      },
    });

    await request(app.getHttpServer())
      .post('/auth/sign-out')
      .set('authorization', 'Bearer access-token')
      .send({ allDevices: true })
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toBe('Sessoes revogadas');
        expect(body.revokedSessions).toBe(1);
      });

    expect(signOutUseCase.execute).toHaveBeenCalledWith({
      userId: currentUser.id,
      accessToken: 'access-token',
      refreshToken: undefined,
      allDevices: true,
    });
  });

  it('reenvia email de verificacao usando dados de cabecalho', async () => {
    resendVerificationUseCase.execute.mockResolvedValue({
      data: { delivered: true, alreadyVerified: false, message: 'ok' },
    });

    await request(app.getHttpServer())
      .post('/auth/verification/resend')
      .set('user-agent', 'jest-agent')
      .set('x-forwarded-for', '45.0.0.1')
      .send({ email: 'user@example.com' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.delivered).toBe(true);
        expect(body.alreadyVerified).toBe(false);
      });

    expect(resendVerificationUseCase.execute).toHaveBeenCalledWith({
      email: 'user@example.com',
      requesterIp: '45.0.0.1',
      userAgent: 'jest-agent',
    });
  });

  it('solicita reset de senha com dados sanitizados', async () => {
    requestResetUseCase.execute.mockResolvedValue({
      data: { delivered: true, message: 'email enviado' },
    });

    await request(app.getHttpServer())
      .post('/auth/password/reset/request')
      .set('user-agent', 'jest-agent')
      .set('x-forwarded-for', '50.0.0.1')
      .send({ email: 'reset@example.com' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.delivered).toBe(true);
      });

    expect(requestResetUseCase.execute).toHaveBeenCalledWith({
      email: 'reset@example.com',
      requesterIp: '50.0.0.1',
      userAgent: 'jest-agent',
    });
  });

  it('confirma reset de senha delegando ao use case', async () => {
    confirmResetUseCase.execute.mockResolvedValue({
      data: { success: true, message: 'senha alterada' },
    });

    await request(app.getHttpServer())
      .post('/auth/password/reset/confirm')
      .send({ accessToken: 'token', newPassword: 'NovaSenha123!' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.success).toBe(true);
      });

    expect(confirmResetUseCase.execute).toHaveBeenCalledWith({
      accessToken: 'token',
      newPassword: 'NovaSenha123!',
      refreshToken: undefined,
    });
  });

  it('retorna 400 quando payload de confirmacao e invalido', async () => {
    await request(app.getHttpServer())
      .post('/auth/password/reset/confirm')
      .send({ accessToken: '', newPassword: '123' })
      .expect(400);

    expect(confirmResetUseCase.execute).not.toHaveBeenCalled();
  });

  it('retorna dados do usuario autenticado em /me', async () => {
    const now = new Date('2025-03-10T10:00:00.000Z');
    currentUser.createdAt = now;
    currentUser.emailVerified = true;
    currentUser.twoFactorEnabled = false;

    await request(app.getHttpServer())
      .get('/auth/me')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({
          id: 'user-1',
          email: 'user@example.com',
          name: 'Usuario',
          role: 'PATIENT',
          tenantId: 'tenant-1',
          createdAt: now.toISOString(),
          emailVerified: true,
          twoFactorEnabled: false,
        });
      });
  });

  it('verifica email delegando ao servico do Supabase', async () => {
    (supabaseAuthService.verifyEmail as jest.Mock).mockResolvedValue({ data: undefined });
    (supabaseAuthService.confirmEmailByEmail as jest.Mock).mockResolvedValue({ data: undefined });

    await request(app.getHttpServer())
      .get('/auth/verify-email')
      .query({ token: 'token-123', email: 'user@example.com' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.success).toBe(true);
        expect(body.message).toContain('Email verificado');
      });

    expect(supabaseAuthService.verifyEmail).toHaveBeenCalledWith('token-123', 'user@example.com');
    expect(supabaseAuthService.confirmEmailByEmail).toHaveBeenCalledWith('user@example.com');
  });

  it('bloqueia sign-in com payload invalido retornando 400', async () => {
    await request(app.getHttpServer())
      .post('/auth/sign-in')
      .send({ email: 'invalido', password: '123' })
      .expect(400);

    expect(signInUseCase.execute).not.toHaveBeenCalled();
  });
});
