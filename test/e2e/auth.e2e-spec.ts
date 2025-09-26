import { ExecutionContext, INestApplication, UnauthorizedException } from '@nestjs/common';
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
import { ISupabaseAuthService, SupabaseUser, SupabaseSession } from '@domain/auth/interfaces/services/supabase-auth.service.interface';
import { success, failure, Result } from '@shared/types/result.type';
import { ICurrentUser } from '@modules/auth/decorators/current-user.decorator';

class StubSignInUseCase implements ISignInUseCase {
  public lastInput?: SignInInput;

  async execute(input: SignInInput) {
    this.lastInput = input;

    if (input.password !== 'SenhaForte123!') {
      return failure(new UnauthorizedException('Credenciais inválidas'));
    }

    return success<SignInOutput>({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 3600,
      user: { id: 'user-1', email: input.email, name: 'Usuário', role: 'PATIENT' },
    });
  }
}

class StubRefreshTokenUseCase implements IRefreshTokenUseCase {
  public lastInput?: RefreshTokenInput;

  async execute(input: RefreshTokenInput) {
    this.lastInput = input;
    return success<RefreshTokenOutput>({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      expiresIn: 7200,
      user: { id: 'user-1', email: 'user@example.com', name: 'Usuário', role: 'PATIENT' },
    });
  }
}

class StubSignOutUseCase implements ISignOutUseCase {
  public lastInput?: SignOutInput;

  async execute(input: SignOutInput) {
    this.lastInput = input;
    return success<SignOutOutput>({ message: 'Sessões revogadas', revokedSessions: input.allDevices ? 2 : 1 });
  }
}

class StubSupabaseAuthService implements ISupabaseAuthService {
  public verifiedTokens: { token: string; email?: string }[] = [];

  async verifyEmail(token: string, email?: string) {
    this.verifiedTokens.push({ token, email });
    if (token === 'invalid') {
      return failure(new UnauthorizedException('Token inválido'));
    }
    return success<void>(undefined);
  }

  async confirmEmailByEmail(email: string) {
    if (email === 'missing@example.com') {
      return failure(new UnauthorizedException('Conta não encontrada'));
    }
    return success<void>(undefined);
  }

  // Métodos não utilizados neste cenário de teste
  /* eslint-disable @typescript-eslint/no-unused-vars */
  async signUp(): Promise<Result<SupabaseUser>> { return failure(new Error('Not implemented')); }
  async signIn(): Promise<Result<SupabaseSession>> { return failure(new Error('Not implemented')); }
  async signOut(): Promise<Result<void>> { return failure(new Error('Not implemented')); }
  async resetPassword(): Promise<Result<void>> { return failure(new Error('Not implemented')); }
  async updatePassword(): Promise<Result<void>> { return failure(new Error('Not implemented')); }
  async getUser(): Promise<Result<SupabaseUser>> { return failure(new Error('Not implemented')); }
  async getUserById(): Promise<Result<any>> { return failure(new Error('Not implemented')); }
  async updateUserMetadata(): Promise<Result<SupabaseUser>> { return failure(new Error('Not implemented')); }
  async refreshToken(): Promise<Result<SupabaseSession>> { return failure(new Error('Not implemented')); }
  async listUsers(): Promise<Result<{ users: any[] }>> { return failure(new Error('Not implemented')); }
  async deleteUser(): Promise<Result<void>> { return failure(new Error('Not implemented')); }
  /* eslint-enable @typescript-eslint/no-unused-vars */
}

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let signInUseCase: StubSignInUseCase;
  let refreshUseCase: StubRefreshTokenUseCase;
  let signOutUseCase: StubSignOutUseCase;
  let supabaseService: StubSupabaseAuthService;

  const currentUser: ICurrentUser = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Usuário',
    role: 'PATIENT',
    tenantId: 'tenant-1',
    sessionId: 'session-1',
    metadata: {},
    createdAt: '2025-03-10T10:00:00.000Z',
    emailVerified: true,
    twoFactorEnabled: false,
  } as ICurrentUser;

  beforeAll(async () => {
    signInUseCase = new StubSignInUseCase();
    refreshUseCase = new StubRefreshTokenUseCase();
    signOutUseCase = new StubSignOutUseCase();
    supabaseService = new StubSupabaseAuthService();

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: ISignInUseCase, useValue: signInUseCase },
        { provide: IRefreshTokenUseCase, useValue: refreshUseCase },
        { provide: ISignOutUseCase, useValue: signOutUseCase },
        { provide: ISupabaseAuthService, useValue: supabaseService },
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

  it('executa sign-in com sucesso e inclui device info', async () => {
    await request(app.getHttpServer())
      .post('/auth/sign-in')
      .set('user-agent', 'jest-agent')
      .send({ email: 'user@example.com', password: 'SenhaForte123!', rememberMe: true })
      .expect(200)
      .expect(({ body }) => {
        expect(body.accessToken).toBe('access-token');
        expect(body.refreshToken).toBe('refresh-token');
      });

    expect(signInUseCase.lastInput).toMatchObject({
      email: 'user@example.com',
      password: 'SenhaForte123!',
      rememberMe: true,
      deviceInfo: {
        userAgent: 'jest-agent',
        ip: expect.any(String),
      },
    });
  });

  it('retorna 401 em sign-in com senha inválida', async () => {
    await request(app.getHttpServer())
      .post('/auth/sign-in')
      .send({ email: 'user@example.com', password: 'senha-errada' })
      .expect(401);
  });

  it('renova tokens e registra fingerprint', async () => {
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('user-agent', 'jest-agent')
      .send({ refreshToken: 'refresh-token' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.accessToken).toBe('new-access');
      });

    expect(refreshUseCase.lastInput).toMatchObject({
      refreshToken: 'refresh-token',
      deviceInfo: {
        userAgent: 'jest-agent',
        ip: expect.any(String),
      },
    });
  });

  it('realiza sign-out revogando sessões', async () => {
    await request(app.getHttpServer())
      .post('/auth/sign-out')
      .set('authorization', 'Bearer access-token')
      .send({ allDevices: true })
      .expect(200)
      .expect(({ body }) => {
        expect(body.revokedSessions).toBe(2);
      });

    expect(signOutUseCase.lastInput).toEqual({
      userId: 'user-1',
      accessToken: 'access-token',
      refreshToken: undefined,
      allDevices: true,
    });
  });

  it('retorna dados do usuário autenticado em /me', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .expect(200)
      .expect(({ body }) => {
        expect(body.email).toBe('user@example.com');
        expect(body.tenantId).toBe('tenant-1');
      });
  });

  it('verifica email com sucesso', async () => {
    await request(app.getHttpServer())
      .get('/auth/verify-email')
      .query({ token: 'valid-token', email: 'user@example.com' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.success).toBe(true);
      });

    expect(supabaseService.verifiedTokens).toContainEqual({ token: 'valid-token', email: 'user@example.com' });
  });

  it('retorna 401 quando token de verificação é inválido', async () => {
    await request(app.getHttpServer())
      .get('/auth/verify-email')
      .query({ token: 'invalid', email: 'user@example.com' })
      .expect(401);
  });
});





