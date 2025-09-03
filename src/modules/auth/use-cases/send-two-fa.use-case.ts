import { Injectable, Inject, Logger } from '@nestjs/common';
import { 
  ISendTwoFAUseCase,
  SendTwoFAInput,
  SendTwoFAOutput 
} from '../../../domain/auth/interfaces/use-cases/send-two-fa.use-case.interface';
import { IAuthRepository, IAuthRepositoryToken } from '../../../domain/auth/interfaces/repositories/auth.repository.interface';
import { IEmailService } from '../../../domain/auth/interfaces/services/email.service.interface';
import { ITwoFactorService } from '../../../domain/auth/interfaces/services/two-factor.service.interface';
import { IJwtService } from '../../../domain/auth/interfaces/services/jwt.service.interface';
import { ISupabaseAuthService } from '../../../domain/auth/interfaces/services/supabase-auth.service.interface';
import { Result } from '../../../shared/types/result.type';
import { AUTH_CONSTANTS } from '../../../shared/constants/auth.constants';
import { extractSupabaseUser, generateSixDigitCode, maskEmail, calculateExpirationMinutes } from '../../../shared/utils/auth.utils';
import { createTwoFactorSendResponse } from '../../../shared/factories/auth-response.factory';
import { AuthErrorFactory, AuthErrorType } from '../../../shared/factories/auth-error.factory';

@Injectable()
export class SendTwoFAUseCase implements ISendTwoFAUseCase {
  private readonly logger = new Logger(SendTwoFAUseCase.name);

  constructor(
    @Inject(IAuthRepositoryToken)
    private readonly authRepository: IAuthRepository,
    @Inject(IEmailService)
    private readonly emailService: IEmailService,
    @Inject(ITwoFactorService)
    private readonly twoFactorService: ITwoFactorService,
    @Inject(IJwtService)
    private readonly jwtService: IJwtService,
    @Inject(ISupabaseAuthService)
    private readonly supabaseAuthService: ISupabaseAuthService,
  ) {}

  async execute(input: SendTwoFAInput): Promise<Result<SendTwoFAOutput>> {
    try {
      const decodedResult = await this.jwtService.verifyTwoFactorToken(input.tempToken);
      if (!decodedResult || decodedResult.error) {
        return AuthErrorFactory.createResult(AuthErrorType.INVALID_TOKEN);
      }

      const userId = input.userId || decodedResult.data?.sub;
      if (!userId) {
        return AuthErrorFactory.createResult(AuthErrorType.USER_ID_NOT_FOUND);
      }
      
      const { data: supabaseUser, error: userError } = await this.supabaseAuthService.getUserById(userId);
      if (userError || !supabaseUser) {
        return AuthErrorFactory.createResult(AuthErrorType.USER_NOT_FOUND, { userId });
      }
      
      const user = extractSupabaseUser(supabaseUser);

      const method = input.method || 'email';

      const code = generateSixDigitCode();
      
      this.logger.warn(`
========================================
🔐 CÓDIGO 2FA GERADO: ${code}
📧 Email: ${user.email}
👤 Usuário: ${user.name}
⏰ Expira em: 5 minutos
========================================
      `);
      
      const maxAttempts = AUTH_CONSTANTS.TWO_FACTOR_MAX_ATTEMPTS;
      
      const existingCode = await this.authRepository.findValidTwoFactorCode(user.id);
      
      const expiresAt = calculateExpirationMinutes(AUTH_CONSTANTS.TWO_FACTOR_CODE_EXPIRES_MINUTES);
      
      await this.authRepository.saveTwoFactorCode(
        user.id,
        code,
        expiresAt,
      );

      const attemptsRemaining = maxAttempts;

      if (method === 'email') {
        const result = await this.emailService.sendTwoFactorCode({
          to: user.email,
          name: user.name,
          code,
          expiresIn: `${AUTH_CONSTANTS.TWO_FACTOR_CODE_EXPIRES_MINUTES} minutes`,
        });

        if (result.error) {
          this.logger.error('Error sending 2FA code', result.error);
          return AuthErrorFactory.createResult(AuthErrorType.EMAIL_SEND_ERROR, { userId, email: user.email });
        }

        this.logger.log(`2FA code sent to ${user.email}`);

        return {
          data: createTwoFactorSendResponse(
            maskEmail(user.email),
            'email',
            attemptsRemaining
          ) as SendTwoFAOutput
        };
      }

      return AuthErrorFactory.createResult(AuthErrorType.METHOD_NOT_IMPLEMENTED, { method });

    } catch (error) {
      this.logger.error('Error sending 2FA code', error);
      return { error: error as Error };
    }
  }

}