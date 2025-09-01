import { Result } from '@shared/types/result.type';

/**
 * Interface para o serviço de email
 */
export interface IEmailService {
  /**
   * Enviar email de verificação
   */
  sendVerificationEmail(data: VerificationEmailData): Promise<Result<void>>;

  /**
   * Enviar email de recuperação de senha
   */
  sendPasswordResetEmail(data: PasswordResetEmailData): Promise<Result<void>>;

  /**
   * Enviar código 2FA por email
   */
  sendTwoFactorCode(data: TwoFactorCodeData): Promise<Result<void>>;

  /**
   * Enviar email de boas-vindas
   */
  sendWelcomeEmail(data: WelcomeEmailData): Promise<Result<void>>;

  /**
   * Enviar notificação de login suspeito
   */
  sendSuspiciousLoginAlert(data: SuspiciousLoginData): Promise<Result<void>>;
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

export const IEmailService = Symbol('IEmailService');