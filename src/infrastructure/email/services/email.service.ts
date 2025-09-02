import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
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

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService implements IEmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('EMAIL_HOST');
    const port = this.configService.get<number>('EMAIL_PORT');
    const user = this.configService.get<string>('EMAIL_USER');
    const pass = this.configService.get<string>('EMAIL_PASS');
    this.from = this.configService.get<string>('EMAIL_FROM') || 'noreply@onterapi.com';

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    this.verifyConnection();
  }

  private async verifyConnection() {
    try {
      await this.transporter.verify();
      this.logger.log('Email service configurado com sucesso');
    } catch (error) {
      this.logger.error('Erro ao configurar email service', error);
    }
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const mailOptions = {
        from: this.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email enviado para ${options.to} - ID: ${info.messageId}`);
      
      if (this.configService.get<string>('EMAIL_HOST') === 'smtp.ethereal.email') {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        this.logger.warn(`
========================================
📧 EMAIL ENVIADO COM SUCESSO!
👀 Visualizar em: ${previewUrl}
========================================
        `);
      }
    } catch (error) {
      this.logger.error(`Erro ao enviar email para ${options.to}`, error);
      throw error;
    }
  }

  async sendTwoFactorCode(data: TwoFactorCodeData): Promise<Result<void>> {
    try {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
          .code { font-size: 32px; font-weight: bold; color: #4CAF50; text-align: center; padding: 20px; background: white; border: 2px dashed #4CAF50; border-radius: 5px; margin: 20px 0; letter-spacing: 5px; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 5px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Código de Verificação</h1>
          </div>
          <div class="content">
            <p>Olá, ${data.name}!</p>
            <p>Você solicitou um código de verificação em dois fatores para acessar sua conta OnTerapi.</p>
            <p>Seu código de verificação é:</p>
            <div class="code">${data.code}</div>
            <p><strong>Este código expira em ${data.expiresIn}.</strong></p>
            <div class="warning">
              <strong>⚠️ Atenção:</strong> Se você não solicitou este código, ignore este email e considere alterar sua senha.
            </div>
          </div>
          <div class="footer">
            <p>© 2025 OnTerapi - Plataforma de Gestão para Clínicas</p>
            <p>Este é um email automático, por favor não responda.</p>
          </div>
        </div>
      </body>
      </html>
    `;

      await this.sendEmail({
        to: data.to,
        subject: `${data.code} - Seu código de verificação OnTerapi`,
        html,
      });
      return { data: undefined };
    } catch (error) {
      this.logger.error('Erro ao enviar código 2FA', error);
      return { error: error as Error };
    }
  }

  async sendWelcomeEmail(data: WelcomeEmailData): Promise<Result<void>> {
    try {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .features { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Bem-vindo ao OnTerapi!</h1>
          </div>
          <div class="content">
            <h2>Olá, ${data.name}!</h2>
            <p>Sua conta foi criada com sucesso na plataforma OnTerapi.</p>
            
            <div class="features">
              <h3>✨ Com o OnTerapi você pode:</h3>
              <ul>
                <li>📅 Gerenciar agendamentos de forma inteligente</li>
                <li>👥 Organizar prontuários de pacientes</li>
                <li>💰 Controlar finanças da clínica</li>
                <li>📊 Acompanhar métricas e relatórios</li>
                <li>🤖 Usar IA para otimizar processos</li>
              </ul>
            </div>
            
            <p style="text-align: center;">
              <a href="https://onterapi.com/login" class="button">Acessar Plataforma</a>
            </p>
            
            <p><strong>Próximos passos:</strong></p>
            <ol>
              <li>Complete seu perfil</li>
              <li>Configure sua clínica</li>
              <li>Convide sua equipe</li>
            </ol>
            
            <p>Se precisar de ajuda, nossa equipe de suporte está sempre disponível!</p>
          </div>
          <div class="footer">
            <p>© 2025 OnTerapi - Transformando a gestão de clínicas</p>
            <p>Este é um email automático, por favor não responda.</p>
          </div>
        </div>
      </body>
      </html>
    `;

      await this.sendEmail({
        to: data.to,
        subject: 'Bem-vindo ao OnTerapi! 🎉',
        html,
      });
      return { data: undefined };
    } catch (error) {
      this.logger.error('Erro ao enviar email de boas-vindas', error);
      return { error: error as Error };
    }
  }

  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<Result<void>> {
    try {
      const resetLink = data.resetLink;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ff6b6b; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
          .button { display: inline-block; padding: 12px 30px; background: #ff6b6b; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔑 Redefinição de Senha</h1>
          </div>
          <div class="content">
            <p>Olá, ${data.name}!</p>
            <p>Recebemos uma solicitação para redefinir a senha da sua conta OnTerapi.</p>
            
            <p style="text-align: center;">
              <a href="${resetLink}" class="button">Redefinir Senha</a>
            </p>
            
            <p>Ou copie e cole este link no seu navegador:</p>
            <p style="word-break: break-all; background: white; padding: 10px; border: 1px solid #ddd; border-radius: 3px;">
              ${resetLink}
            </p>
            
            <div class="warning">
              <strong>⚠️ Importante:</strong>
              <ul style="margin: 10px 0;">
                <li>Este link expira em ${data.expiresIn}</li>
                <li>Se você não solicitou esta redefinição, ignore este email</li>
                <li>Sua senha atual continuará funcionando até você criar uma nova</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            <p>© 2025 OnTerapi - Plataforma de Gestão para Clínicas</p>
            <p>Este é um email automático, por favor não responda.</p>
          </div>
        </div>
      </body>
      </html>
    `;

      await this.sendEmail({
        to: data.to,
        subject: 'Redefinição de Senha - OnTerapi',
        html,
      });
      return { data: undefined };
    } catch (error) {
      this.logger.error('Erro ao enviar email de reset', error);
      return { error: error as Error };
    }
  }

  async sendVerificationEmail(data: VerificationEmailData): Promise<Result<void>> {
    try {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
            .button { display: inline-block; padding: 12px 30px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✉️ Verificação de Email</h1>
            </div>
            <div class="content">
              <p>Olá, ${data.name}!</p>
              <p>Por favor, confirme seu endereço de email clicando no botão abaixo:</p>
              
              <p style="text-align: center;">
                <a href="${data.verificationLink}" class="button">Verificar Email</a>
              </p>
              
              <p>Ou copie e cole este link no seu navegador:</p>
              <p style="word-break: break-all; background: white; padding: 10px; border: 1px solid #ddd; border-radius: 3px;">
                ${data.verificationLink}
              </p>
              
              <p><strong>Este link expira em ${data.expiresIn}.</strong></p>
            </div>
            <div class="footer">
              <p>© 2025 OnTerapi - Plataforma de Gestão para Clínicas</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await this.sendEmail({
        to: data.to,
        subject: 'Verifique seu email - OnTerapi',
        html,
      });
      return { data: undefined };
    } catch (error) {
      this.logger.error('Erro ao enviar email de verificação', error);
      return { error: error as Error };
    }
  }

  async sendSuspiciousLoginAlert(data: SuspiciousLoginData): Promise<Result<void>> {
    try {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ff6b6b; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
            .alert { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .details { background: white; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ Alerta de Segurança</h1>
            </div>
            <div class="content">
              <p>Olá, ${data.name}!</p>
              
              <div class="alert">
                <strong>Detectamos um login suspeito na sua conta OnTerapi.</strong>
              </div>
              
              <p>Detalhes do acesso:</p>
              <div class="details">
                <p><strong>📅 Data/Hora:</strong> ${data.timestamp.toLocaleString('pt-BR')}</p>
                <p><strong>🌍 IP:</strong> ${data.ip}</p>
                ${data.location ? `<p><strong>📍 Localização:</strong> ${data.location}</p>` : ''}
                <p><strong>💻 Dispositivo:</strong> ${data.device}</p>
              </div>
              
              <p><strong>Se foi você:</strong> Pode ignorar este email.</p>
              <p><strong>Se não foi você:</strong></p>
              <ol>
                <li>Altere sua senha imediatamente</li>
                <li>Ative a autenticação em dois fatores</li>
                <li>Entre em contato com nosso suporte</li>
              </ol>
            </div>
            <div class="footer">
              <p>© 2025 OnTerapi - Sua segurança é nossa prioridade</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await this.sendEmail({
        to: data.to,
        subject: '⚠️ Alerta de Segurança - OnTerapi',
        html,
      });
      return { data: undefined };
    } catch (error) {
      this.logger.error('Erro ao enviar alerta de login suspeito', error);
      return { error: error as Error };
    }
  }

  async sendLoginAlertEmail(data: LoginAlertData): Promise<Result<void>> {
    try {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
            .details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #4CAF50; }
            .details p { margin: 10px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            .success { color: #4CAF50; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Login Realizado com Sucesso</h1>
            </div>
            <div class="content">
              <p>Olá <strong>${data.userName}</strong>,</p>
              
              <p>Sua conta OnTerapi foi acessada com sucesso. Este é um email automático para confirmar que o login foi realizado.</p>
              
              <div class="details">
                <h3>📊 Detalhes do Acesso:</h3>
                <p><strong>📅 Data/Hora:</strong> ${data.loginDate}</p>
                <p><strong>🌍 Endereço IP:</strong> ${data.ipAddress}</p>
                <p><strong>📍 Localização:</strong> ${data.location}</p>
                <p><strong>💻 Dispositivo:</strong> ${data.device}</p>
                <p><strong>🌐 Navegador:</strong> ${data.userAgent}</p>
              </div>
              
              <p><strong class="success">✓ Este foi você?</strong> Ótimo! Pode ignorar este email.</p>
              
              <p><strong>❌ Não reconhece este acesso?</strong> Tome as seguintes medidas imediatamente:</p>
              <ol>
                <li>Altere sua senha agora mesmo</li>
                <li>Ative a autenticação em dois fatores (2FA)</li>
                <li>Entre em contato com nosso suporte: suporte@onterapi.com.br</li>
              </ol>
              
              <p style="margin-top: 30px;">
                <small>Este é um email automático de segurança. Por favor, não responda.</small>
              </p>
            </div>
            <div class="footer">
              <p>© 2025 OnTerapi - Plataforma de Terapias Integrativas</p>
              <p>Sua segurança é nossa prioridade</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await this.sendEmail({
        to: data.to,
        subject: '✅ Login Realizado - OnTerapi',
        html,
      });
      
      this.logger.log(`Email de alerta de login enviado para ${data.to}`);
      return { data: undefined };
    } catch (error) {
      this.logger.error('Erro ao enviar email de alerta de login', error);
      return { error: error as Error };
    }
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
}