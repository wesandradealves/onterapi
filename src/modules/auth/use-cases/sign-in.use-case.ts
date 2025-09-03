import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ISignInUseCase, SignInInput, SignInOutput } from '../../../domain/auth/interfaces/use-cases/sign-in.use-case.interface';
import { IAuthRepository, IAuthRepositoryToken } from '../../../domain/auth/interfaces/repositories/auth.repository.interface';
import { ISupabaseAuthService } from '../../../domain/auth/interfaces/services/supabase-auth.service.interface';
import { IJwtService } from '../../../domain/auth/interfaces/services/jwt.service.interface';
import { IEmailService } from '../../../domain/auth/interfaces/services/email.service.interface';
import { Result } from '../../../shared/types/result.type';
import { AUTH_CONSTANTS } from '../../../shared/constants/auth.constants';
import { extractSupabaseUser, normalizeLoginInfo } from '../../../shared/utils/auth.utils';
import { createTokenResponse, createTwoFactorTempResponse } from '../../../shared/factories/auth-response.factory';
import { AuthErrorFactory, AuthErrorType } from '../../../shared/factories/auth-error.factory';
import { AuthTokenHelper } from '../../../shared/helpers/auth-token.helper';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';

@Injectable()
export class SignInUseCase implements ISignInUseCase {
  private readonly logger = new Logger(SignInUseCase.name);

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
  ) {}

  async execute(input: SignInInput): Promise<Result<SignInOutput>> {
    try {
      const user = await this.authenticateUser(input.email, input.password);
      
      if (!user) {
        return AuthErrorFactory.createResult(AuthErrorType.INVALID_CREDENTIALS, { email: input.email });
      }

      if (user.twoFactorEnabled) {
        return this.handleTwoFactorAuth(user.id);
      }

      const tokens = await this.generateUserTokens(user, input);
      const output = this.createAuthOutput(tokens, user);
      
      await this.sendLoginNotifications(user, tokens, input);
      
      return { data: output as SignInOutput };
    } catch (error) {
      this.logger.error('Erro no login', error);
      return { error: error as Error };
    }
  }

  private async authenticateUser(email: string, password: string) {
    const supabaseResult = await this.supabaseAuthService.signIn(email, password);

    if (supabaseResult.error) {
      this.logger.warn(`Login falhou para ${email}: ${supabaseResult.error.message}`);
      return null;
    }

    const supabaseUser = supabaseResult.data.user;
    const { data: fullUser } = await this.supabaseAuthService.getUserById(supabaseUser.id);
    
    this.logger.log(`Full user data: ${JSON.stringify(fullUser)}`);
    
    const user = extractSupabaseUser(fullUser);
    this.logger.log(`Final user role: ${user.role}`);
    
    return user;
  }

  private handleTwoFactorAuth(userId: string) {
    const tempToken = this.jwtService.generateTwoFactorToken(userId);
    return { data: createTwoFactorTempResponse(tempToken) };
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

    try {
      await this.emailService.sendLoginAlertEmail(loginInfo);
      this.logger.log(`Email de alerta de login enviado para ${user.email}`);
    } catch (emailError) {
      this.logger.error(`Erro ao enviar email de alerta de login: ${emailError}`);
    }

    this.logger.log(`Login bem-sucedido para ${user.email}`);
    
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
    this.logger.log(`Evento USER_LOGGED_IN publicado para ${user.email}`);
  }

}