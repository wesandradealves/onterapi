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

      const supabaseResult = await this.supabaseAuthService.signIn(
        input.email,
        input.password,
      );

      if (supabaseResult.error) {
        this.logger.warn(`Login falhou para ${input.email}: ${supabaseResult.error.message}`);
        return AuthErrorFactory.createResult(AuthErrorType.INVALID_CREDENTIALS, { email: input.email });
      }

      const supabaseUser = supabaseResult.data.user;
      
      const { data: fullUser } = await this.supabaseAuthService.getUserById(supabaseUser.id);
      this.logger.log(`Full user data: ${JSON.stringify(fullUser)}`);
      
      const user = extractSupabaseUser(fullUser);
      this.logger.log(`Final user role: ${user.role}`);


      if (user.twoFactorEnabled) {
        const tempToken = this.jwtService.generateTwoFactorToken(user.id);
        return { data: createTwoFactorTempResponse(tempToken) };
      }

      const tokenHelper = new AuthTokenHelper(this.jwtService);
      const tokens = await tokenHelper.generateAndSaveTokens(
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

      const output = createTokenResponse(
        { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, expiresIn: AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRES_IN },
        { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId }
      );

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
      
      return { data: output as SignInOutput };
    } catch (error) {
      this.logger.error('Erro no login', error);
      return { error: error as Error };
    }
  }

}