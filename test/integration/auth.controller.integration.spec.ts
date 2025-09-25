import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AuthController } from '@modules/auth/api/controllers/auth.controller';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { ISignInUseCase, SignInInput, SignInOutput } from '@domain/auth/interfaces/use-cases/sign-in.use-case.interface';
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
import { ISupabaseAuthService } from '@domain/auth/interfaces/services/supabase-auth.service.interface';
import { ICurrentUser } from '@modules/auth/decorators/current-user.decorator';

const createMock = <TInput, TOutput>() => ({ execute: jest.fn<Promise<{ data: TOutput }>, [TInput]>() });

describe('AuthController (integration)', () => {
  let app: INestApplication;

  const currentUser: ICurrentUser = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Usuário',
    role: 'PATIENT',
    tenantId: 'tenant-1',
    sessionId: 'session-1',
    metadata: {},
  } as ICurrentUser;

  const signInUseCase = createMock<SignInInput, SignInOutput>();
  const refreshUseCase = createMock<RefreshTokenInput, RefreshTokenOutput>();
  const signOutUseCase = createMock<SignOutInput, SignOutOutput>();
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
        { provide: ISupabaseAuthService, useValue: supabaseAuthService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const request = context.switchToHttp().getRequest();
          request.user = currentUser;
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
        user: { id: 'user-1', email: 'user@example.com', name: 'Usuário', role: 'PATIENT' },
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
        user: { id: 'user-1', email: 'user@example.com', name: 'Usuário', role: 'PATIENT' },
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
        message: 'Sessões revogadas',
        revokedSessions: 1,
      },
    });

    await request(app.getHttpServer())
      .post('/auth/sign-out')
      .set('authorization', 'Bearer access-token')
      .send({ allDevices: true })
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toBe('Sessões revogadas');
        expect(body.revokedSessions).toBe(1);
      });

    expect(signOutUseCase.execute).toHaveBeenCalledWith({
      userId: currentUser.id,
      accessToken: 'access-token',
      refreshToken: undefined,
      allDevices: true,
    });
  });

  it('retorna dados do usuário autenticado em /me', async () => {
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
          name: 'Usuário',
          role: 'PATIENT',
          tenantId: 'tenant-1',
          createdAt: now.toISOString(),
          emailVerified: true,
          twoFactorEnabled: false,
        });
      });
  });

  it('verifica email delegando ao serviço do Supabase', async () => {
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
    expect(supabaseAuthService.confirmEmailByEmail).toHaveBeenCalledWith('user@example.com');
  });

  it('bloqueia sign-in com payload inválido retornando 400', async () => {
    await request(app.getHttpServer())
      .post('/auth/sign-in')
      .send({ email: 'invalido', password: '123' })
      .expect(400);

    expect(signInUseCase.execute).not.toHaveBeenCalled();
  });
});







