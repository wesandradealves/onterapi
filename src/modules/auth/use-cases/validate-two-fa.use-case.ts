import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  IValidateTwoFAUseCase,
  ValidateTwoFAInput,
  ValidateTwoFAOutput,
} from '../../../domain/auth/interfaces/use-cases/validate-two-fa.use-case.interface';
import {
  IAuthRepository,
  IAuthRepositoryToken,
} from '../../../domain/auth/interfaces/repositories/auth.repository.interface';
import { IJwtService } from '../../../domain/auth/interfaces/services/jwt.service.interface';
import { ITwoFactorService } from '../../../domain/auth/interfaces/services/two-factor.service.interface';
import { ISupabaseAuthService } from '../../../domain/auth/interfaces/services/supabase-auth.service.interface';
import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import { AUTH_CONSTANTS } from '../../../shared/constants/auth.constants';
import {
  ExtractedUser,
  extractSupabaseUser,
  normalizeDeviceInfo,
} from '../../../shared/utils/auth.utils';
import { createTokenResponse } from '../../../shared/factories/auth-response.factory';
import { AuthErrorFactory, AuthErrorType } from '../../../shared/factories/auth-error.factory';
import { AuthTokenHelper } from '../../../shared/helpers/auth-token.helper';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';
import { MESSAGES } from '../../../shared/constants/messages.constants';

@Injectable()
export class ValidateTwoFAUseCase
  extends BaseUseCase<ValidateTwoFAInput, ValidateTwoFAOutput>
  implements IValidateTwoFAUseCase
{
  protected readonly logger = new Logger(ValidateTwoFAUseCase.name);

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
  ) {
    super();
  }

  protected async handle(input: ValidateTwoFAInput): Promise<ValidateTwoFAOutput> {
    const tempTokenResult = this.jwtService.verifyTwoFactorToken(input.tempToken);
    if (tempTokenResult.error) {
      throw AuthErrorFactory.create(AuthErrorType.INVALID_TOKEN);
    }

    const userId = tempTokenResult.data.sub;

    const { data: supabaseUser, error: userError } =
      await this.supabaseAuthService.getUserById(userId);
    if (userError || !supabaseUser) {
      throw AuthErrorFactory.create(AuthErrorType.USER_NOT_FOUND, { userId });
    }

    const user: ExtractedUser = extractSupabaseUser(supabaseUser);

    this.logger.log(MESSAGES.LOGS.TWO_FA_CODE_VALIDATING);

    const isValidCode = await this.validateCode(user.id, user.twoFactorSecret, input.code);
    if (!isValidCode) {
      this.logger.warn(`${MESSAGES.LOGS.TWO_FA_CODE_INVALID} ${user.email}`);

      const event = DomainEvents.twoFaFailed(user.id, {
        userId: user.id,
        email: user.email,
        attemptedAt: new Date().toISOString(),
      });

      await this.messageBus.publish(event);
      this.logger.log(`${MESSAGES.EVENTS.TWO_FA_FAILED} para ${user.email}`);

      throw AuthErrorFactory.create(AuthErrorType.INVALID_2FA_CODE, {
        userId: user.id,
        email: user.email,
      });
    }

    this.logger.log(MESSAGES.LOGS.TWO_FA_CODE_VALID);

    const tokenHelper = new AuthTokenHelper(this.jwtService, this.authRepository);
    const tokens = await tokenHelper.generateAndSaveTokens(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        rememberMe: input.trustDevice,
      },
      normalizeDeviceInfo({
        ...input.deviceInfo,
        trustedDevice: input.trustDevice,
      }),
    );

    const { error: updateError } = await this.supabaseAuthService.updateUserMetadata(user.id, {
      ...user,
      lastLoginAt: new Date().toISOString(),
    });

    if (updateError) {
      this.logger.error(MESSAGES.LOGS.SUPABASE_UPDATE_ERROR, updateError);
    }

    const output = createTokenResponse(
      {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRES_IN,
      },
      { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId },
    );

    this.logger.log(`2FA validado com sucesso para ${user.email}`);

    const event = DomainEvents.twoFaValidated(user.id, { userId: user.id, email: user.email });

    await this.messageBus.publish(event);
    this.logger.log(`Evento TWO_FA_VALIDATED publicado para ${user.email}`);

    return output as ValidateTwoFAOutput;
  }

  private async validateCode(
    userId: string,
    secret: string | null | undefined,
    code: string,
  ): Promise<boolean> {
    if (secret && this.twoFactorService.verifyTOTP(secret, code)) {
      return true;
    }

    return await this.authRepository.validateTwoFactorCode(userId, code);
  }
}
