import { Injectable, Logger, Inject } from '@nestjs/common';
import { IRefreshTokenUseCase, RefreshTokenInput, RefreshTokenOutput } from '../../../domain/auth/interfaces/use-cases/refresh-token.use-case.interface';
import { IAuthRepository, IAuthRepositoryToken } from '../../../domain/auth/interfaces/repositories/auth.repository.interface';
import { IJwtService } from '../../../domain/auth/interfaces/services/jwt.service.interface';
import { ISupabaseAuthService } from '../../../domain/auth/interfaces/services/supabase-auth.service.interface';
import { Result } from '../../../shared/types/result.type';
import { AUTH_CONSTANTS } from '../../../shared/constants/auth.constants';
import { extractSupabaseUser } from '../../../shared/utils/auth.utils';
import { createTokenResponse } from '../../../shared/factories/auth-response.factory';
import { AuthErrorFactory, AuthErrorType } from '../../../shared/factories/auth-error.factory';
import { AuthTokenHelper } from '../../../shared/helpers/auth-token.helper';

@Injectable()
export class RefreshTokenUseCase implements IRefreshTokenUseCase {
  private readonly logger = new Logger(RefreshTokenUseCase.name);

  constructor(
    @Inject(IAuthRepositoryToken)
    private readonly authRepository: IAuthRepository,
    @Inject(IJwtService)
    private readonly jwtService: IJwtService,
    @Inject(ISupabaseAuthService)
    private readonly supabaseAuthService: ISupabaseAuthService,
  ) {}

  async execute(input: RefreshTokenInput): Promise<Result<RefreshTokenOutput>> {
    try {
      const tokenResult = this.jwtService.verifyRefreshToken(input.refreshToken);
      if (tokenResult.error) {
        return AuthErrorFactory.createResult(AuthErrorType.INVALID_TOKEN);
      }

      const sessionUser = await this.authRepository.validateRefreshToken(input.refreshToken);
      if (!sessionUser) {
        this.logger.warn('Refresh token não encontrado ou expirado');
        return AuthErrorFactory.createResult(AuthErrorType.SESSION_EXPIRED);
      }

      const { data: supabaseData, error: userError } = await this.supabaseAuthService.getUserById(sessionUser.id);
      if (userError || !supabaseData) {
        this.logger.error('Erro ao buscar usuário do Supabase', userError);
        return AuthErrorFactory.createResult(AuthErrorType.USER_NOT_FOUND, { userId: sessionUser.id });
      }

      const user = extractSupabaseUser(supabaseData);

      if (!user.isActive) {
        await this.authRepository.removeRefreshToken(input.refreshToken);
        return AuthErrorFactory.createResult(AuthErrorType.ACCOUNT_DISABLED, { userId: user.id, email: user.email });
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

      this.logger.log(`Token renovado para usuário ${user.email}`);
      return { data: output as RefreshTokenOutput };
    } catch (error) {
      this.logger.error('Erro ao renovar token', error);
      return { error: error as Error };
    }
  }
}