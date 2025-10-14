import { Result } from '../../../../shared/types/result.type';

export interface IEmailService {
  sendVerificationEmail(data: VerificationEmailData): Promise<Result<void>>;

  sendPasswordResetEmail(data: PasswordResetEmailData): Promise<Result<void>>;

  sendTwoFactorCode(data: TwoFactorCodeData): Promise<Result<void>>;

  sendWelcomeEmail(data: WelcomeEmailData): Promise<Result<void>>;

  sendSuspiciousLoginAlert(data: SuspiciousLoginData): Promise<Result<void>>;

  sendLoginAlertEmail(data: LoginAlertData): Promise<Result<void>>;

  sendPasswordChangedEmail(data: PasswordChangedEmailData): Promise<Result<void>>;

  sendClinicAlertEmail(data: ClinicAlertEmailData): Promise<Result<void>>;
}

export interface VerificationEmailData {
  to: string;
  name: string;
  verificationLink: string;
  expiresIn: string;
}

export interface PasswordResetEmailData {
  to: string;
  name: string;
  resetLink: string;
  expiresIn: string;
}

export interface TwoFactorCodeData {
  to: string;
  name: string;
  code: string;
  expiresIn: string;
}

export interface WelcomeEmailData {
  to: string;
  name: string;
  role: string;
  tenantName?: string;
}

export interface SuspiciousLoginData {
  to: string;
  name: string;
  ip: string;
  location?: string;
  device: string;
  timestamp: Date;
}

export interface LoginAlertData {
  to: string;
  userName: string;
  loginDate: string;
  ipAddress: string;
  userAgent: string;
  location: string;
  device: string;
}

export interface PasswordChangedEmailData {
  to: string;
  name: string;
  changedAt: Date;
  ip?: string;
  device?: string;
}

export interface ClinicAlertEmailData {
  to: string;
  clinicName: string;
  alertType: string;
  status: 'triggered' | 'resolved';
  triggeredAt: Date;
  resolvedAt?: Date;
  triggeredBy?: string;
  resolvedBy?: string;
  channel?: string;
  payload?: Record<string, unknown>;
}

export const IEmailService = Symbol('IEmailService');
