import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
  LoginAlertData,
  PasswordResetEmailData,
  TwoFactorCodeData,
  VerificationEmailData,
} from '../../../domain/auth/interfaces/services/email.service.interface';
import { Result } from '../../../shared/types/result.type';
import { MESSAGES } from '../../../shared/constants/messages.constants';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class AuthEmailService {
  private readonly logger = new Logger(AuthEmailService.name);
  private readonly resend: Resend;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      throw new Error('Missing required configuration: RESEND_API_KEY');
    }
    const defaultFrom = 'Onterapi <onboarding@resend.dev>';
    this.resend = new Resend(apiKey);
    this.from = this.configService.get<string>('EMAIL_FROM') || defaultFrom;
  }

  private async sendEmail(options: EmailOptions): Promise<Result<void>> {
    try {
      const response = await this.resend.emails.send({
        from: this.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      if (response.error) {
        const error = new Error(response.error.message);
        this.logger.error(MESSAGES.ERRORS.EMAIL.SEND_ERROR, error);
        return { error };
      }

      if (response.data?.id) {
        this.logger.log('Email sent: ' + response.data.id);
      } else {
        this.logger.log('Email sent');
      }

      return { data: undefined };
    } catch (error) {
      this.logger.error(MESSAGES.ERRORS.EMAIL.SEND_ERROR, error);
      return { error: error as Error };
    }
  }

  async sendVerificationEmail(data: VerificationEmailData): Promise<Result<void>> {
    const subject = 'Verifique seu e-mail - Onterapi';
    const html = this.getVerificationEmailTemplate(data);

    return this.sendEmail({
      to: data.to,
      subject,
      html,
    });
  }

  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<Result<void>> {
    const subject = 'Redefinir senha - Onterapi';
    const html = this.getPasswordResetTemplate(data);

    return this.sendEmail({
      to: data.to,
      subject,
      html,
    });
  }

  async sendTwoFactorCodeEmail(data: TwoFactorCodeData): Promise<Result<void>> {
    const subject = 'C�digo de verifica��o - Onterapi';
    const html = this.getTwoFactorCodeTemplate(data);

    return this.sendEmail({
      to: data.to,
      subject,
      html,
    });
  }

  async sendLoginAlertEmail(data: LoginAlertData): Promise<Result<void>> {
    const subject = 'Alerta de novo login - Onterapi';
    const html = this.getLoginAlertTemplate(data);

    return this.sendEmail({
      to: data.to,
      subject,
      html,
    });
  }
  private getVerificationEmailTemplate(data: VerificationEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { 
              display: inline-block; 
              padding: 12px 24px; 
              background-color: #007bff; 
              color: white; 
              text-decoration: none; 
              border-radius: 4px; 
              margin: 20px 0;
            }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Verificação de E-mail</h2>
            <p>Olá ${data.name},</p>
            <p>Obrigado por se cadastrar na Onterapi! Para completar seu cadastro, por favor verifique seu e-mail clicando no botão abaixo:</p>
            <a href="${data.verificationLink}" class="button">Verificar E-mail</a>
            <p>Ou copie e cole este link no seu navegador:</p>
            <p>${data.verificationLink}</p>
            <p>Este link expira em ${data.expiresIn}.</p>
            <div class="footer">
              <p>Se você não criou uma conta na Onterapi, por favor ignore este e-mail.</p>
              <p>© 2024 Onterapi. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getPasswordResetTemplate(data: PasswordResetEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { 
              display: inline-block; 
              padding: 12px 24px; 
              background-color: #dc3545; 
              color: white; 
              text-decoration: none; 
              border-radius: 4px; 
              margin: 20px 0;
            }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Redefinir Senha</h2>
            <p>Olá ${data.name},</p>
            <p>Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha:</p>
            <a href="${data.resetLink}" class="button">Redefinir Senha</a>
            <p>Ou copie e cole este link no seu navegador:</p>
            <p>${data.resetLink}</p>
            <p>Este link expira em ${data.expiresIn}.</p>
            <div class="footer">
              <p>Se você não solicitou a redefinição de senha, por favor ignore este e-mail.</p>
              <p>© 2024 Onterapi. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getTwoFactorCodeTemplate(data: TwoFactorCodeData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .code { 
              font-size: 32px; 
              font-weight: bold; 
              letter-spacing: 5px; 
              background-color: #f8f9fa; 
              padding: 20px; 
              text-align: center; 
              border-radius: 8px; 
              margin: 20px 0;
            }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Código de Verificação</h2>
            <p>Use o código abaixo para completar seu login:</p>
            <div class="code">${data.code}</div>
            <p>Este código expira em ${data.expiresIn}.</p>
            <div class="footer">
              <p>Se você não solicitou este código, por favor ignore este e-mail.</p>
              <p>© 2024 Onterapi. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getLoginAlertTemplate(data: LoginAlertData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .alert { background-color: #fff3cd; padding: 15px; border-radius: 4px; border-left: 4px solid #ffc107; }
            .details { background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0; }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Novo Login Detectado</h2>
            <div class="alert">
              <p><strong>Atenção:</strong> Detectamos um novo login em sua conta.</p>
            </div>
            <div class="details">
              <p><strong>Detalhes do acesso:</strong></p>
              <ul>
                <li>Data/Hora: ${new Date().toLocaleString('pt-BR')}</li>
                <li>Localização: ${data.location}</li>
                <li>Dispositivo: ${data.device}</li>
              </ul>
            </div>
            <p>Se foi você, pode ignorar este e-mail. Se não reconhece este acesso, por favor altere sua senha imediatamente.</p>
            <div class="footer">
              <p>© 2024 Onterapi. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}

