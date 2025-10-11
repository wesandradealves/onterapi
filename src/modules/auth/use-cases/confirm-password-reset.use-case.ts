import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import {
  ConfirmPasswordResetInput,
  ConfirmPasswordResetOutput,
  IConfirmPasswordResetUseCase,
} from '../../../domain/auth/interfaces/use-cases/confirm-password-reset.use-case.interface';
import {
  IAuthRepository,
  IAuthRepositoryToken,
} from '../../../domain/auth/interfaces/repositories/auth.repository.interface';
import { ISupabaseAuthService } from '../../../domain/auth/interfaces/services/supabase-auth.service.interface';
import { IEmailService } from '../../../domain/auth/interfaces/services/email.service.interface';
import { AuthErrorFactory, AuthErrorType } from '../../../shared/factories/auth-error.factory';
import { AUTH_MESSAGES } from '../../../shared/constants/auth.constants';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';
import { maskEmail } from '../../../shared/utils/auth.utils';

@Injectable()
export class ConfirmPasswordResetUseCase
  extends BaseUseCase<ConfirmPasswordResetInput, ConfirmPasswordResetOutput>
  implements IConfirmPasswordResetUseCase
{
  protected readonly logger = new Logger(ConfirmPasswordResetUseCase.name);

  constructor(
    @Inject(IAuthRepositoryToken)
    private readonly authRepository: IAuthRepository,
    @Inject(ISupabaseAuthService)
    private readonly supabaseAuthService: ISupabaseAuthService,
    @Inject(IEmailService)
    private readonly emailService: IEmailService,
    private readonly messageBus: MessageBus,
  ) {
    super();
  }

  protected async handle(input: ConfirmPasswordResetInput): Promise<ConfirmPasswordResetOutput> {
    const accessToken = input.accessToken.trim();

    if (!accessToken) {
      throw AuthErrorFactory.create(AuthErrorType.INVALID_RESET_TOKEN);
    }

    const userResult = await this.supabaseAuthService.getUser(accessToken);

    if (userResult.error || !userResult.data) {
      this.logger.error('Invalid or expired reset token');
      throw AuthErrorFactory.create(AuthErrorType.INVALID_RESET_TOKEN);
    }

    const supabaseUser = userResult.data;
    const maskedEmail = maskEmail(supabaseUser.email);

    const updateResult = await this.supabaseAuthService.updatePassword(
      accessToken,
      input.newPassword,
      input.refreshToken,
    );

    if (updateResult.error) {
      this.logger.error(`Failed to update password for ${maskedEmail}`, updateResult.error);
      throw AuthErrorFactory.create(AuthErrorType.INVALID_RESET_TOKEN);
    }

    const user = await this.authRepository.findBySupabaseId(supabaseUser.id);

    const metadataRaw = supabaseUser.metadata?.name;
    const metadataName = typeof metadataRaw === 'string' ? metadataRaw.trim() : '';
    const userName = user?.name ? user.name.trim() : '';
    const recipientName = userName || metadataName || supabaseUser.email.split('@')[0];

    const emailResult = await this.emailService.sendPasswordChangedEmail({
      to: supabaseUser.email,
      name: recipientName,
      changedAt: new Date(),
    });

    if (emailResult.error) {
      this.logger.warn(
        `Failed to send password changed email for ${maskedEmail}`,
        emailResult.error,
      );
    }

    if (user) {
      await this.authRepository.update(user.id, {
        emailVerified: supabaseUser.emailVerified || user.emailVerified,
        emailVerifiedAt: supabaseUser.emailVerified ? new Date() : user.emailVerifiedAt,
        metadata: {
          ...(user.metadata ?? {}),
          lastPasswordResetAt: new Date().toISOString(),
        },
      });

      const event = DomainEvents.passwordResetCompleted(user.id, supabaseUser.email, {
        userId: user.id,
        tenantId: user.tenantId,
      });

      await this.messageBus.publish(event);
      this.logger.log(`Password reset completed for ${maskedEmail}`);
    } else {
      this.logger.warn(
        `Password reset completed for Supabase user without local record: ${maskedEmail}`,
      );
    }

    return {
      success: true,
      message: AUTH_MESSAGES.SUCCESS.PASSWORD_RESET,
    };
  }
}
