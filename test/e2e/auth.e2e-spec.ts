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
import {
  ISupabaseAuthService,
  SupabaseGeneratedLink,
  SupabaseGenerateLinkOptions,
  SupabaseSession,
  SupabaseUser,
} from '@domain/auth/interfaces/services/supabase-auth.service.interface';
import { failure, Result, success, unwrapResult } from '@shared/types/result.type';
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

  async executeOrThrow(input: SignInInput) {
    return unwrapResult(await this.execute(input));
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

  async executeOrThrow(input: RefreshTokenInput) {
    return unwrapResult(await this.execute(input));
  }
}

class StubSignOutUseCase implements ISignOutUseCase {
  public lastInput?: SignOutInput;

  async execute(input: SignOutInput) {
    this.lastInput = input;
    return success<SignOutOutput>({
      message: 'Sessões revogadas',
      revokedSessions: input.allDevices ? 2 : 1,
    });
  }

  async executeOrThrow(input: SignOutInput) {
    return unwrapResult(await this.execute(input));
  }
}

class StubResendVerificationEmailUseCase implements IResendVerificationEmailUseCase {
  public lastInput?: ResendVerificationEmailInput;
  public response: ResendVerificationEmailOutput = {
    delivered: true,
    alreadyVerified: false,
    message: 'ok',
  };

  async execute(input: ResendVerificationEmailInput) {
    this.lastInput = input;
    return success(this.response);
  }

  async executeOrThrow(input: ResendVerificationEmailInput) {
    return unwrapResult(await this.execute(input));
  }
}

class StubRequestPasswordResetUseCase implements IRequestPasswordResetUseCase {
  public lastInput?: RequestPasswordResetInput;
  public response: RequestPasswordResetOutput = {
    delivered: true,
    message: 'email enviado',
  };

  async execute(input: RequestPasswordResetInput) {
    this.lastInput = input;
    return success(this.response);
  }

  async executeOrThrow(input: RequestPasswordResetInput) {
    return unwrapResult(await this.execute(input));
  }
}

class StubConfirmPasswordResetUseCase implements IConfirmPasswordResetUseCase {
  public lastInput?: ConfirmPasswordResetInput;
  public response: ConfirmPasswordResetOutput = {
    success: true,
    message: 'senha alterada',
  };

  async execute(input: ConfirmPasswordResetInput) {
    if (!input.accessToken) {
      return failure(new UnauthorizedException('Token inválido'));
    }
    this.lastInput = input;
    return success(this.response);
  }

  async executeOrThrow(input: ConfirmPasswordResetInput) {
    return unwrapResult(await this.execute(input));
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

  // Métodos não exercitados nestes cenários
  /* eslint-disable @typescript-eslint/no-unused-vars */
  async signUp(): Promise<Result<SupabaseUser>> {
    return failure(new Error('Not implemented'));
  }
  async signIn(): Promise<Result<SupabaseSession>> {
    return failure(new Error('Not implemented'));
  }
  async signOut(): Promise<Result<void>> {
    return failure(new Error('Not implemented'));
  }
  async resetPassword(): Promise<Result<void>> {
    return failure(new Error('Not implemented'));
  }
  async updatePassword(): Promise<Result<void>> {
    return failure(new Error('Not implemented'));
  }
  async getUser(): Promise<Result<SupabaseUser>> {
    return failure(new Error('Not implemented'));
  }
  async getUserById(): Promise<Result<SupabaseUser>> {
    return failure(new Error('Not implemented'));
  }
  async updateUserMetadata(): Promise<Result<SupabaseUser>> {
    return failure(new Error('Not implemented'));
  }
  async refreshToken(): Promise<Result<SupabaseSession>> {
    return failure(new Error('Not implemented'));
  }
  async listUsers(): Promise<Result<{ users: SupabaseUser[] }>> {
    return failure(new Error('Not implemented'));
  }
  async deleteUser(): Promise<Result<void>> {
    return failure(new Error('Not implemented'));
  }
  async generateVerificationLink(
    _email: string,
    _options?: SupabaseGenerateLinkOptions,
  ): Promise<Result<SupabaseGeneratedLink>> {
    return failure(new Error('Not implemented'));
  }
  async generatePasswordResetLink(
    _email: string,
    _options?: SupabaseGenerateLinkOptions,
  ): Promise<Result<SupabaseGeneratedLink>> {
    return failure(new Error('Not implemented'));
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */
}

const currentUser: ICurrentUser = {
  id: 'user-1',
  email: 'user@example.com',
  name: 'Usuário',
  role: 'PATIENT',
  tenantId: 'tenant-1',
  sessionId: 'session-1',
  metadata: {},
} as ICurrentUser;

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let signInUseCase: StubSignInUseCase;
  let refreshUseCase: StubRefreshTokenUseCase;
  let signOutUseCase: StubSignOutUseCase;
  let resendUseCase: StubResendVerificationEmailUseCase;
  let requestResetUseCase: StubRequestPasswordResetUseCase;
  let confirmResetUseCase: StubConfirmPasswordResetUseCase;
  let supabaseService: StubSupabaseAuthService;

  beforeAll(async () => {
    signInUseCase = new StubSignInUseCase();
    refreshUseCase = new StubRefreshTokenUseCase();
    signOutUseCase = new StubSignOutUseCase();
    resendUseCase = new StubResendVerificationEmailUseCase();
    requestResetUseCase = new StubRequestPasswordResetUseCase();
    confirmResetUseCase = new StubConfirmPasswordResetUseCase();
    supabaseService = new StubSupabaseAuthService();

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: ISignInUseCase, useValue: signInUseCase },
        { provide: IRefreshTokenUseCase, useValue: refreshUseCase },
        { provide: ISignOutUseCase, useValue: signOutUseCase },
        { provide: IResendVerificationEmailUseCase, useValue: resendUseCase },
        { provide: IRequestPasswordResetUseCase, useValue: requestResetUseCase },
        { provide: IConfirmPasswordResetUseCase, useValue: confirmResetUseCase },
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

  it('reenvia email de verificacao capturando ip e user agent', async () => {
    await request(app.getHttpServer())
      .post('/auth/verification/resend')
      .set('user-agent', 'jest-agent')
      .set('x-forwarded-for', '45.0.0.1')
      .send({ email: 'user@example.com' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.delivered).toBe(true);
      });

    expect(resendUseCase.lastInput).toEqual({
      email: 'user@example.com',
      requesterIp: '45.0.0.1',
      userAgent: 'jest-agent',
    });
  });

  it('solicita reset de senha registrando fingerprint', async () => {
    await request(app.getHttpServer())
      .post('/auth/password/reset/request')
      .set('user-agent', 'jest-agent')
      .set('x-forwarded-for', '50.0.0.1')
      .send({ email: 'reset@example.com' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.delivered).toBe(true);
      });

    expect(requestResetUseCase.lastInput).toEqual({
      email: 'reset@example.com',
      requesterIp: '50.0.0.1',
      userAgent: 'jest-agent',
    });
  });

  it('confirma reset de senha utilizando use case dedicado', async () => {
    await request(app.getHttpServer())
      .post('/auth/password/reset/confirm')
      .send({ accessToken: 'token', newPassword: 'NovaSenha123!' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.success).toBe(true);
      });

    expect(confirmResetUseCase.lastInput).toEqual({
      accessToken: 'token',
      newPassword: 'NovaSenha123!',
      refreshToken: undefined,
    });
  });

  it('retorna 400 quando confirmacao de reset é inválida', async () => {
    await request(app.getHttpServer())
      .post('/auth/password/reset/confirm')
      .send({ accessToken: '', newPassword: '123' })
      .expect(400);
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

    expect(supabaseService.verifiedTokens).toContainEqual({
      token: 'valid-token',
      email: 'user@example.com',
    });
  });

  it('retorna 401 quando token de verificação é inválido', async () => {
    await request(app.getHttpServer())
      .get('/auth/verify-email')
      .query({ token: 'invalid', email: 'user@example.com' })
      .expect(401);
  });
});
