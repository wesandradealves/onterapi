import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import { ISignInUseCase, SignInInput, SignInOutput } from '../../../domain/auth/interfaces/use-cases/sign-in.use-case.interface';
import { IAuthRepository, IAuthRepositoryToken } from '../../../domain/auth/interfaces/repositories/auth.repository.interface';
import { ISupabaseAuthService } from '../../../domain/auth/interfaces/services/supabase-auth.service.interface';
import { IJwtService } from '../../../domain/auth/interfaces/services/jwt.service.interface';
import { IEmailService } from '../../../domain/auth/interfaces/services/email.service.interface';
import { AUTH_CONSTANTS } from '../../../shared/constants/auth.constants';
import { extractSupabaseUser, normalizeLoginInfo } from '../../../shared/utils/auth.utils';
import { maskEmailForLog } from '../../../shared/utils/logging.utils';
import { createTokenResponse, createTwoFactorTempResponse } from '../../../shared/factories/auth-response.factory';
import { AuthErrorFactory, AuthErrorType } from '../../../shared/factories/auth-error.factory';
import { AuthTokenHelper } from '../../../shared/helpers/auth-token.helper';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';

@Injectable()
export class SignInUseCase extends BaseUseCase<SignInInput, SignInOutput> implements ISignInUseCase {
  protected readonly logger = new Logger(SignInUseCase.name);

  constructor(
    @Inject(IAuthRepositoryToken)
    private readonly authRepository: IAuthRepository,
    @Inject(ISupabaseAuthService)
    private readonly supabaseAuthService: ISupabaseAuthService,
    @Inject(IJwtService)
    private readonly jwtService: IJwtService,
    @Inject(IEmailService)
    private readonly emailService: IEmailService,
    private readonly configService: ConfigService,
    private readonly messageBus: MessageBus,
  ) {
    super();
  }

  protected async handle(input: SignInInput): Promise<SignInOutput> {
      const user = await this.authenticateUser(input.email, input.password);
      
      if (!user) {
        throw AuthErrorFactory.create(AuthErrorType.INVALID_CREDENTIALS, { email: input.email });
      }

      if (!user.emailConfirmed) {
        throw AuthErrorFactory.create(AuthErrorType.EMAIL_NOT_VERIFIED, { email: input.email });
      }

      if (user.twoFactorEnabled) {
        return this.handleTwoFactorAuth(user.id) as SignInOutput;
      }

      const tokens = await this.generateUserTokens(user, input);
      const output = this.createAuthOutput(tokens, user);
      
      await this.sendLoginNotifications(user, tokens, input);
      
      return output as SignInOutput;
  }

  private async authenticateUser(email: string, password: string) {
    if (await this.authRepository.isUserLocked(email)) {
      const maskedEmail = maskEmailForLog(email);
      this.logger.warn('Conta bloqueada', { email: maskedEmail });
      throw AuthErrorFactory.create(AuthErrorType.ACCOUNT_LOCKED, { email });
    }

    const supabaseResult = await this.supabaseAuthService.signIn(email, password);

    if (supabaseResult.error) {
      this.logger.warn(`Login falhou: ${supabaseResult.error.message}`);

      const messageLower = supabaseResult.error.message.toLowerCase();
      if (messageLower.includes('invalid login credentials')) {
        await this.authRepository.incrementFailedAttempts(email);
      }

      if (supabaseResult.error.message.includes('Email not confirmed')) {
        throw AuthErrorFactory.create(AuthErrorType.EMAIL_NOT_VERIFIED, { email });
      }

      return null;
    }

    const supabaseUser = supabaseResult.data.user;
    const { data: fullUser } = await this.supabaseAuthService.getUserById(supabaseUser.id);

    const user = extractSupabaseUser(fullUser);

    this.logger.debug('Usuario Supabase carregado', { userId: user.id, role: user.role });

    await this.authRepository.resetFailedAttempts(email);

    return user;
  }

  private handleTwoFactorAuth(userId: string) {
    const tempToken = this.jwtService.generateTwoFactorToken(userId);
    return createTwoFactorTempResponse(tempToken);
  }

  private async generateUserTokens(user: any, input: SignInInput) {
    const tokenHelper = new AuthTokenHelper(this.jwtService);
    return await tokenHelper.generateAndSaveTokens(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        rememberMe: input.rememberMe,
      },
      input.deviceInfo,
      this.jwtService,
      this.authRepository
    );
  }

  private createAuthOutput(tokens: any, user: any) {
    return createTokenResponse(
      { 
        accessToken: tokens.accessToken, 
        refreshToken: tokens.refreshToken, 
        expiresIn: AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRES_IN 
      },
      { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        role: user.role, 
        tenantId: user.tenantId 
      }
    );
  }

  private async sendLoginNotifications(user: any, tokens: any, input: SignInInput) {
    const loginInfo = normalizeLoginInfo(user, input.deviceInfo);
    const maskedEmail = maskEmailForLog(user.email || '');

    const emailResult = await this.emailService.sendLoginAlertEmail(loginInfo);
    if (emailResult.error) {
      this.logger.error('Erro ao enviar email de alerta de login', emailResult.error);
    } else {
      this.logger.log('Email de alerta de login enviado', { email: maskedEmail });
    }

    this.logger.log('Login bem-sucedido', { email: maskedEmail });
    
    const event = DomainEvents.userLoggedIn(
      user.id,
      {
        email: user.email,
        sessionId: tokens.sessionId,
        ip: loginInfo.ipAddress,
        userAgent: loginInfo.userAgent,
        device: loginInfo.device,
      },
      { userId: user.id }
    );
    
    await this.messageBus.publish(event);
    this.logger.log('Evento USER_LOGGED_IN publicado', { userId: user.id, email: maskedEmail });
  }

}
