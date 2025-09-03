import { Injectable } from '@nestjs/common';
import { AuthEmailService } from './auth-email.service';
import { NotificationEmailService } from './notification-email.service';
import { 
  IEmailService,
  VerificationEmailData,
  PasswordResetEmailData,
  TwoFactorCodeData,
  WelcomeEmailData,
  SuspiciousLoginData,
  LoginAlertData
} from '../../../domain/auth/interfaces/services/email.service.interface';
import { Result } from '../../../shared/types/result.type';

@Injectable()
export class EmailService implements IEmailService {
  constructor(
    private readonly authEmailService: AuthEmailService,
    private readonly notificationEmailService: NotificationEmailService,
  ) {}

  async sendVerificationEmail(data: VerificationEmailData): Promise<Result<void>> {
    return this.authEmailService.sendVerificationEmail(data);
  }

  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<Result<void>> {
    return this.authEmailService.sendPasswordResetEmail(data);
  }

  async sendTwoFactorCodeEmail(data: TwoFactorCodeData): Promise<Result<void>> {
    return this.authEmailService.sendTwoFactorCodeEmail(data);
  }

  async sendWelcomeEmail(data: WelcomeEmailData): Promise<Result<void>> {
    return this.notificationEmailService.sendWelcomeEmail(data);
  }

  async sendSuspiciousLoginEmail(data: SuspiciousLoginData): Promise<Result<void>> {
    return this.notificationEmailService.sendSuspiciousLoginEmail(data);
  }

  async sendLoginAlertEmail(data: LoginAlertData): Promise<Result<void>> {
    return this.authEmailService.sendLoginAlertEmail(data);
  }

  async sendTwoFactorCode(data: TwoFactorCodeData): Promise<Result<void>> {
    return this.sendTwoFactorCodeEmail(data);
  }

  async sendSuspiciousLoginAlert(data: SuspiciousLoginData): Promise<Result<void>> {
    return this.sendSuspiciousLoginEmail(data);
  }
}