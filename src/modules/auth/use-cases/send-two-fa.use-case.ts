import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ISendTwoFAUseCase,
  SendTwoFAInput,
  SendTwoFAOutput,
} from '../../../domain/auth/interfaces/use-cases/send-two-fa.use-case.interface';
import {
  IAuthRepository,
  IAuthRepositoryToken,
} from '../../../domain/auth/interfaces/repositories/auth.repository.interface';
import { IEmailService } from '../../../domain/auth/interfaces/services/email.service.interface';
import { ITwoFactorService } from '../../../domain/auth/interfaces/services/two-factor.service.interface';
import { IJwtService } from '../../../domain/auth/interfaces/services/jwt.service.interface';
import { ISupabaseAuthService } from '../../../domain/auth/interfaces/services/supabase-auth.service.interface';
import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import { AUTH_CONSTANTS } from '../../../shared/constants/auth.constants';
import {
  calculateExpirationMinutes,
  extractSupabaseUser,
  generateSixDigitCode,
  maskEmail,
} from '../../../shared/utils/auth.utils';
import { createTwoFactorSendResponse } from '../../../shared/factories/auth-response.factory';
import { shouldLogSensitiveData } from '../../../shared/utils/logging.utils';
import { AuthErrorFactory, AuthErrorType } from '../../../shared/factories/auth-error.factory';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';
import { MESSAGES } from '../../../shared/constants/messages.constants';

@Injectable()
export class SendTwoFAUseCase
  extends BaseUseCase<SendTwoFAInput, SendTwoFAOutput>
  implements ISendTwoFAUseCase
{
  protected readonly logger = new Logger(SendTwoFAUseCase.name);

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
    private readonly messageBus: MessageBus,
  ) {
    super();
  }

  protected async handle(input: SendTwoFAInput): Promise<SendTwoFAOutput> {
    const decodedResult = await this.jwtService.verifyTwoFactorToken(input.tempToken);
    if (!decodedResult || decodedResult.error) {
      throw AuthErrorFactory.create(AuthErrorType.INVALID_TOKEN);
    }

    const userId = input.userId || decodedResult.data?.sub;
    if (!userId) {
      throw AuthErrorFactory.create(AuthErrorType.USER_ID_NOT_FOUND);
    }

    const { data: supabaseUser, error: userError } =
      await this.supabaseAuthService.getUserById(userId);
    if (userError || !supabaseUser) {
      throw AuthErrorFactory.create(AuthErrorType.USER_NOT_FOUND, { userId });
    }

    const user = extractSupabaseUser(supabaseUser);

    const method = input.method || 'email';
    const code = generateSixDigitCode();

    const maskedEmail = maskEmail(user.email);
    this.logger.log(
      `[2FA] Codigo gerado para ${maskedEmail}; expira em ${AUTH_CONSTANTS.TWO_FACTOR_CODE_EXPIRES_MINUTES} minutos.`,
    );
    if (shouldLogSensitiveData()) {
      this.logger.log(`[2FA] Codigo gerado (ambiente nao produtivo): ${code}`);
    }

    const maxAttempts = AUTH_CONSTANTS.TWO_FACTOR_MAX_ATTEMPTS;
    const expiresAt = calculateExpirationMinutes(AUTH_CONSTANTS.TWO_FACTOR_CODE_EXPIRES_MINUTES);

    await this.authRepository.saveTwoFactorCode(user.id, code, expiresAt);

    const attemptsRemaining = maxAttempts;

    if (method === 'email') {
      const result = await this.emailService.sendTwoFactorCode({
        to: user.email,
        name: user.name,
        code,
        expiresIn: `${AUTH_CONSTANTS.TWO_FACTOR_CODE_EXPIRES_MINUTES} minutes`,
      });

      if (result.error) {
        this.logger.error(MESSAGES.LOGS.TWO_FA_CODE_SEND_ERROR, result.error);
        throw AuthErrorFactory.create(AuthErrorType.EMAIL_SEND_ERROR, {
          userId,
          email: user.email,
        });
      }

      this.logger.log(`Codigo 2FA enviado para ${maskedEmail}`);

      const event = DomainEvents.twoFaSent(user.id, 'email', {
        userId: user.id,
        email: user.email,
      });

      await this.messageBus.publish(event);
      this.logger.log(`Evento TWO_FA_SENT publicado para ${maskedEmail}`);

      return createTwoFactorSendResponse(
        maskedEmail,
        'email',
        attemptsRemaining,
      ) as SendTwoFAOutput;
    }

    throw AuthErrorFactory.create(AuthErrorType.METHOD_NOT_IMPLEMENTED, { method });
  }
}
