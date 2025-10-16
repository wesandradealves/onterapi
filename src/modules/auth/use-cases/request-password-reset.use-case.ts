import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import {
  IRequestPasswordResetUseCase,
  RequestPasswordResetInput,
  RequestPasswordResetOutput,
} from '../../../domain/auth/interfaces/use-cases/request-password-reset.use-case.interface';
import {
  IAuthRepository,
  IAuthRepositoryToken,
} from '../../../domain/auth/interfaces/repositories/auth.repository.interface';
import { IEmailService } from '../../../domain/auth/interfaces/services/email.service.interface';
import {
  ISupabaseAuthService,
  SupabaseGeneratedLink,
} from '../../../domain/auth/interfaces/services/supabase-auth.service.interface';
import { AUTH_CONSTANTS, AUTH_MESSAGES } from '../../../shared/constants/auth.constants';
import { AuthErrorFactory, AuthErrorType } from '../../../shared/factories/auth-error.factory';
import { maskEmail } from '../../../shared/utils/auth.utils';
import { DomainEvents } from '../../../shared/events/domain-events';
import { MessageBus } from '../../../shared/messaging/message-bus';

@Injectable()
export class RequestPasswordResetUseCase
  extends BaseUseCase<RequestPasswordResetInput, RequestPasswordResetOutput>
  implements IRequestPasswordResetUseCase
{
  protected readonly logger = new Logger(RequestPasswordResetUseCase.name);

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

  protected async handle(input: RequestPasswordResetInput): Promise<RequestPasswordResetOutput> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const maskedEmail = maskEmail(normalizedEmail);

    const user = await this.authRepository.findByEmail(normalizedEmail);

    if (!user) {
      this.logger.warn(`Password reset requested for non-existent email: ${maskedEmail}`);
      return {
        delivered: false,
        message: 'Se o email estiver cadastrado, enviaremos instru  es para redefinir a senha.',
      };
    }

    const linkResult = await this.supabaseAuthService.generatePasswordResetLink(normalizedEmail);

    if (linkResult.error || !linkResult.data) {
      this.logger.error(
        `Failed to generate password reset link for ${maskedEmail}`,
        linkResult.error,
      );
      throw AuthErrorFactory.create(AuthErrorType.EMAIL_SEND_ERROR, { email: maskedEmail });
    }

    const link: SupabaseGeneratedLink = linkResult.data;
    const expiresInMinutes = AUTH_CONSTANTS.PASSWORD_RESET_LINK_EXPIRES_MINUTES;
    const expiresInText = `${expiresInMinutes} minutos`;

    const emailResult = await this.emailService.sendPasswordResetEmail({
      to: normalizedEmail,
      name: user.name,
      resetLink: link.actionLink,
      expiresIn: expiresInText,
    });

    if (emailResult.error) {
      this.logger.error(`Failed to send password reset email to ${maskedEmail}`, emailResult.error);
      throw AuthErrorFactory.create(AuthErrorType.EMAIL_SEND_ERROR, { email: maskedEmail });
    }

    const event = DomainEvents.passwordResetRequested(user.id, normalizedEmail, {
      userId: user.id,
      tenantId: user.tenantId,
    });

    await this.messageBus.publish(event);
    this.logger.log(`Password reset email sent to ${maskedEmail}`);

    return {
      delivered: true,
      message: AUTH_MESSAGES.SUCCESS.RESET_EMAIL_SENT,
    };
  }
}
