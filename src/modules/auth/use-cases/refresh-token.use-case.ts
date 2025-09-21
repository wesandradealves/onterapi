import { Injectable, Logger, Inject } from '@nestjs/common';
import { IRefreshTokenUseCase, RefreshTokenInput, RefreshTokenOutput } from '../../../domain/auth/interfaces/use-cases/refresh-token.use-case.interface';
import { IAuthRepository, IAuthRepositoryToken } from '../../../domain/auth/interfaces/repositories/auth.repository.interface';
import { IJwtService } from '../../../domain/auth/interfaces/services/jwt.service.interface';
import { ISupabaseAuthService } from '../../../domain/auth/interfaces/services/supabase-auth.service.interface';
import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import { AUTH_CONSTANTS } from '../../../shared/constants/auth.constants';
import { extractSupabaseUser } from '../../../shared/utils/auth.utils';
import { maskEmailForLog } from '../../../shared/utils/logging.utils';
import { createTokenResponse } from '../../../shared/factories/auth-response.factory';
import { AuthErrorFactory, AuthErrorType } from '../../../shared/factories/auth-error.factory';
import { AuthTokenHelper } from '../../../shared/helpers/auth-token.helper';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';
import { MESSAGES } from '../../../shared/constants/messages.constants';

@Injectable()
export class RefreshTokenUseCase extends BaseUseCase<RefreshTokenInput, RefreshTokenOutput> implements IRefreshTokenUseCase {
  protected readonly logger = new Logger(RefreshTokenUseCase.name);

  constructor(
    @Inject(IAuthRepositoryToken)
    private readonly authRepository: IAuthRepository,
    @Inject(IJwtService)
    private readonly jwtService: IJwtService,
    @Inject(ISupabaseAuthService)
    private readonly supabaseAuthService: ISupabaseAuthService,
    private readonly messageBus: MessageBus,
  ) {
    super();
  }

  protected async handle(input: RefreshTokenInput): Promise<RefreshTokenOutput> {
      const tokenResult = this.jwtService.verifyRefreshToken(input.refreshToken);
      if (tokenResult.error) {
        throw AuthErrorFactory.create(AuthErrorType.INVALID_TOKEN);
      }

      const sessionUser = await this.authRepository.validateRefreshToken(input.refreshToken);
      if (!sessionUser) {
        this.logger.warn(MESSAGES.LOGS.REFRESH_TOKEN_NOT_FOUND);
        throw AuthErrorFactory.create(AuthErrorType.SESSION_EXPIRED);
      }

      const { data: supabaseData, error: userError } = await this.supabaseAuthService.getUserById(sessionUser.id);
      if (userError || !supabaseData) {
        this.logger.error(MESSAGES.LOGS.SUPABASE_USER_FETCH_ERROR, userError);
        throw AuthErrorFactory.create(AuthErrorType.USER_NOT_FOUND, { userId: sessionUser.id });
      }

      const user = extractSupabaseUser(supabaseData);
      const maskedEmail = maskEmailForLog(user.email);

      if (!user.isActive) {
        await this.authRepository.removeRefreshToken(input.refreshToken);
        throw AuthErrorFactory.create(AuthErrorType.ACCOUNT_DISABLED, { userId: user.id, email: user.email });
      }

      await this.authRepository.removeRefreshToken(input.refreshToken);

      const tokenHelper = new AuthTokenHelper(this.jwtService);
      const tokens = await tokenHelper.generateAndSaveTokens(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
          rememberMe: false,
        },
        input.deviceInfo,
        this.jwtService,
        this.authRepository
      );

      const output = createTokenResponse(
        { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, expiresIn: AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRES_IN },
        { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId }
      );

      this.logger.log('Token renovado', { userId: user.id, email: maskedEmail });
      
      const event = DomainEvents.tokenRefreshed(
        user.id,
        { sessionId: tokens.sessionId },
        { userId: user.id }
      );
      
      await this.messageBus.publish(event);
      this.logger.log('Evento TOKEN_REFRESHED publicado', { userId: user.id });
      
      return output as RefreshTokenOutput;
  }
}
