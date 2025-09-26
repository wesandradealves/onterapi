import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import {
  IResendVerificationEmailUseCase,
  ResendVerificationEmailInput,
  ResendVerificationEmailOutput,
} from '../../../domain/auth/interfaces/use-cases/resend-verification-email.use-case.interface';
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
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';

@Injectable()
export class ResendVerificationEmailUseCase
  extends BaseUseCase<ResendVerificationEmailInput, ResendVerificationEmailOutput>
  implements IResendVerificationEmailUseCase
{
  protected readonly logger = new Logger(ResendVerificationEmailUseCase.name);

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

  protected async handle(
    input: ResendVerificationEmailInput,
  ): Promise<ResendVerificationEmailOutput> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const maskedEmail = maskEmail(normalizedEmail);

    const user = await this.authRepository.findByEmail(normalizedEmail);

    if (!user) {
      this.logger.warn(`Resend verification requested for non-existent email: ${maskedEmail}`);
      return {
        delivered: false,
        alreadyVerified: false,
        message: 'Se o email estiver cadastrado, reenviamos as instruções de confirmação.',
      };
    }

    if (user.emailVerified) {
      this.logger.log(`Email already verified for ${maskedEmail}`);
      return {
        delivered: false,
        alreadyVerified: true,
        message: 'Este email já está verificado. Você pode fazer login normalmente.',
      };
    }

    const linkResult = await this.supabaseAuthService.generateVerificationLink(normalizedEmail);

    if (linkResult.error || !linkResult.data) {
      this.logger.error(
        `Failed to generate verification link for ${maskedEmail}`,
        linkResult.error,
      );
      throw AuthErrorFactory.create(AuthErrorType.EMAIL_SEND_ERROR, { email: maskedEmail });
    }

    const link: SupabaseGeneratedLink = linkResult.data;
    const expiresInMinutes = AUTH_CONSTANTS.EMAIL_VERIFICATION_LINK_EXPIRES_MINUTES;
    const expiresInText = `${expiresInMinutes} minutos`;

    const emailResult = await this.emailService.sendVerificationEmail({
      to: normalizedEmail,
      name: user.name,
      verificationLink: link.actionLink,
      expiresIn: expiresInText,
    });

    if (emailResult.error) {
      this.logger.error(`Failed to send verification email to ${maskedEmail}`, emailResult.error);
      throw AuthErrorFactory.create(AuthErrorType.EMAIL_SEND_ERROR, { email: maskedEmail });
    }

    await this.authRepository.update(user.id, {
      emailVerificationSentAt: new Date(),
      emailVerificationToken: link.hashedToken,
    });

    const event = DomainEvents.emailVerificationResent(user.id, normalizedEmail, {
      userId: user.id,
      tenantId: user.tenantId,
    });

    await this.messageBus.publish(event);
    this.logger.log(`Verification email resent for ${maskedEmail}`);

    return {
      delivered: true,
      alreadyVerified: false,
      message: AUTH_MESSAGES.SUCCESS.VERIFICATION_EMAIL_SENT,
    };
  }
}
