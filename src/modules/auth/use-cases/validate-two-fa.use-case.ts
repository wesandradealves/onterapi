import { Injectable, Logger, Inject } from '@nestjs/common';
import { IValidateTwoFAUseCase, ValidateTwoFAInput, ValidateTwoFAOutput } from '../../../domain/auth/interfaces/use-cases/validate-two-fa.use-case.interface';
import { IAuthRepository, IAuthRepositoryToken } from '../../../domain/auth/interfaces/repositories/auth.repository.interface';
import { IJwtService } from '../../../domain/auth/interfaces/services/jwt.service.interface';
import { ITwoFactorService } from '../../../domain/auth/interfaces/services/two-factor.service.interface';
import { ISupabaseAuthService } from '../../../domain/auth/interfaces/services/supabase-auth.service.interface';
import { Result } from '../../../shared/types/result.type';
import { AUTH_CONSTANTS } from '../../../shared/constants/auth.constants';
import { extractSupabaseUser } from '../../../shared/utils/auth.utils';
import { createTokenResponse } from '../../../shared/factories/auth-response.factory';
import { AuthErrorFactory, AuthErrorType } from '../../../shared/factories/auth-error.factory';
import { AuthTokenHelper } from '../../../shared/helpers/auth-token.helper';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';

@Injectable()
export class ValidateTwoFAUseCase implements IValidateTwoFAUseCase {
  private readonly logger = new Logger(ValidateTwoFAUseCase.name);

  constructor(
    @Inject(IAuthRepositoryToken)
    private readonly authRepository: IAuthRepository,
    @Inject(IJwtService)
    private readonly jwtService: IJwtService,
    @Inject(ITwoFactorService)
    private readonly twoFactorService: ITwoFactorService,
    @Inject(ISupabaseAuthService)
    private readonly supabaseAuthService: ISupabaseAuthService,
    private readonly messageBus: MessageBus,
  ) {}

  async execute(input: ValidateTwoFAInput): Promise<Result<ValidateTwoFAOutput>> {
    try {
      const tempTokenResult = this.jwtService.verifyTwoFactorToken(input.tempToken);
      if (tempTokenResult.error) {
        return AuthErrorFactory.createResult(AuthErrorType.INVALID_TOKEN);
      }

      const userId = tempTokenResult.data.sub;

      const { data: supabaseUser, error: userError } = await this.supabaseAuthService.getUserById(userId);
      if (userError || !supabaseUser) {
        return AuthErrorFactory.createResult(AuthErrorType.USER_NOT_FOUND, { userId });
      }
      
      const user = extractSupabaseUser(supabaseUser);

      this.logger.warn(`
========================================
🔍 VALIDANDO CÓDIGO 2FA
📧 Email: ${user.email}
🔢 Código recebido: ${input.code}
========================================
      `);
      
      const isValidCode = await this.validateCode(user.id, user.twoFactorSecret!, input.code);
      if (!isValidCode) {
        this.logger.warn(`❌ Código 2FA inválido para usuário ${user.email}`);
        return AuthErrorFactory.createResult(AuthErrorType.INVALID_2FA_CODE, { userId: user.id, email: user.email });
      }
      
      this.logger.warn(`✅ Código 2FA válido! Gerando tokens de acesso...`);

      const tokenHelper = new AuthTokenHelper(this.jwtService);
      const tokens = await tokenHelper.generateAndSaveTokens(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
          rememberMe: input.trustDevice,
        },
        {
          ...input.deviceInfo,
          trustedDevice: input.trustDevice,
        },
        this.jwtService,
        this.authRepository
      );

      const { error: updateError } = await this.supabaseAuthService.updateUserMetadata(user.id, {
        ...user,
        lastLoginAt: new Date().toISOString(),
      });

      if (updateError) {
        this.logger.error('Erro ao atualizar lastLoginAt no Supabase', updateError);
      }

      const output = createTokenResponse(
        { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, expiresIn: AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRES_IN },
        { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId }
      );

      this.logger.log(`2FA validado com sucesso para ${user.email}`);
      
      const event = DomainEvents.twoFaValidated(
        user.id,
        { userId: user.id, email: user.email }
      );
      
      await this.messageBus.publish(event);
      this.logger.log(`Evento TWO_FA_VALIDATED publicado para ${user.email}`);
      
      return { data: output as ValidateTwoFAOutput };
    } catch (error) {
      this.logger.error('Erro na validação 2FA', error);
      return { error: error as Error };
    }
  }

  private async validateCode(userId: string, secret: string, code: string): Promise<boolean> {
    if (secret && this.twoFactorService.verifyTOTP(secret, code)) {
      return true;
    }

    return await this.authRepository.validateTwoFactorCode(userId, code);
  }
}