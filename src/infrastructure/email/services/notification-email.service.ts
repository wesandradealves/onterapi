import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
  ClinicAlertEmailData,
  PasswordChangedEmailData,
  SuspiciousLoginData,
  WelcomeEmailData,
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
export class NotificationEmailService {
  private readonly logger = new Logger(NotificationEmailService.name);
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

  async sendWelcomeEmail(data: WelcomeEmailData): Promise<Result<void>> {
    const subject = 'Bem-vindo Ã  Onterapi!';
    const html = this.getWelcomeEmailTemplate(data);

    return this.sendEmail({
      to: data.to,
      subject,
      html,
    });
  }

  async sendPasswordChangedEmail(data: PasswordChangedEmailData): Promise<Result<void>> {
    const subject = 'Senha alterada com sucesso - Onterapi';
    const html = this.getPasswordChangedTemplate(data);

    return this.sendEmail({
      to: data.to,
      subject,
      html,
    });
  }

  async sendClinicAlertEmail(data: ClinicAlertEmailData): Promise<Result<void>> {
    const statusLabel = data.status === 'resolved' ? 'Alerta resolvido' : 'Alerta disparado';
    const subject = `[Onterapi] ${statusLabel} - ${data.alertType}`;
    const html = this.getClinicAlertTemplate(data);

    return this.sendEmail({
      to: data.to,
      subject,
      html,
    });
  }
  private getPasswordChangedTemplate(data: PasswordChangedEmailData): string {
    const displayName = (data.name?.trim() ?? '') || data.to.split('@')[0];
    const changedAt = data.changedAt.toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
    const deviceInfo = data.device ? `<li><strong>Dispositivo:</strong> ${data.device}</li>` : '';
    const ipInfo = data.ip ? `<li><strong>IP:</strong> ${data.ip}</li>` : '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa; border-radius: 8px; }
            .header { text-align: center; border-bottom: 1px solid #dee2e6; padding-bottom: 20px; margin-bottom: 20px; }
            .details { background: #fff; border-radius: 6px; padding: 20px; border: 1px solid #e9ecef; }
            .details ul { list-style: none; padding: 0; margin: 0; }
            .details li { margin: 8px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Sua senha foi atualizada</h2>
            </div>
            <p>Olá, ${displayName}!</p>
            <p>Confirmamos que a sua senha foi alterada com sucesso.</p>
            <div class="details">
              <h3>Detalhes da alteração</h3>
              <ul>
                <li><strong>Data e hora:</strong> ${changedAt}</li>
                ${deviceInfo}
                ${ipInfo}
              </ul>
            </div>
            <p>Se você não reconhece esta alteração, recomendamos redefinir a senha imediatamente ou entrar em contato com o suporte.</p>
            <div class="footer">
              <p>Equipe Onterapi</p>
              <p>© ${new Date().getFullYear()} Onterapi. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
  async sendSuspiciousLoginEmail(data: SuspiciousLoginData): Promise<Result<void>> {
    const subject = 'Atividade suspeita detectada - Onterapi';
    const html = this.getSuspiciousLoginTemplate(data);

    return this.sendEmail({
      to: data.to,
      subject,
      html,
    });
  }
  private getWelcomeEmailTemplate(data: WelcomeEmailData): string {
    const roleNames: Record<string, string> = {
      USER: 'UsuÃ¡rio',
      ADJUNCT: 'Auxiliar',
      CONSULTANT: 'Consultor',
      MANAGER: 'Gerente',
      ADMIN: 'Administrador',
      SUPER_ADMIN: 'Super Administrador',
      ADMIN_SUPORTE: 'Administrador de Suporte',
      ADMIN_FINANCEIRO: 'Administrador Financeiro',
    };

    const roleName = roleNames[data.role] || data.role;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              color: white; 
              padding: 30px; 
              text-align: center; 
              border-radius: 8px 8px 0 0;
            }
            .content { padding: 30px; background: #f8f9fa; }
            .features { 
              background: white; 
              padding: 20px; 
              border-radius: 8px; 
              margin: 20px 0;
            }
            .feature-item { padding: 10px 0; border-bottom: 1px solid #eee; }
            .feature-item:last-child { border-bottom: none; }
            .cta-button { 
              display: inline-block; 
              padding: 15px 30px; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              color: white; 
              text-decoration: none; 
              border-radius: 30px; 
              margin: 20px 0;
            }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>ðŸŽ‰ Bem-vindo Ã  Onterapi!</h1>
            </div>
            <div class="content">
              <h2>OlÃ¡, ${data.name}!</h2>
              <p>Ã‰ com grande prazer que damos as boas-vindas Ã  plataforma Onterapi.</p>
              <p>Sua conta foi criada com sucesso com o perfil: <strong>${roleName}</strong></p>
              
              <div class="features">
                <h3>O que vocÃª pode fazer agora:</h3>
                <div class="feature-item">âœ… Acessar o painel de controle</div>
                <div class="feature-item">âœ… Configurar seu perfil</div>
                <div class="feature-item">âœ… Explorar os recursos disponÃ­veis</div>
                <div class="feature-item">âœ… Personalizar suas preferÃªncias</div>
              </div>
              
              <div style="text-align: center;">
                <a href="https://app.onterapi.com/dashboard" class="cta-button">Acessar Plataforma</a>
              </div>
              
              <p><strong>Dicas para comeÃ§ar:</strong></p>
              <ul>
                <li>Complete seu perfil para uma experiÃªncia personalizada</li>
                <li>Explore a documentaÃ§Ã£o para conhecer todos os recursos</li>
                <li>Configure as notificaÃ§Ãµes de acordo com suas preferÃªncias</li>
              </ul>
            </div>
            <div class="footer">
              <p>Precisa de ajuda? Entre em contato conosco: suporte@onterapi.com</p>
              <p>Â© 2024 Onterapi. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getSuspiciousLoginTemplate(data: SuspiciousLoginData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .alert-header { 
              background-color: #dc3545; 
              color: white; 
              padding: 20px; 
              text-align: center; 
              border-radius: 8px 8px 0 0;
            }
            .alert-content { 
              background-color: #fff5f5; 
              border: 2px solid #dc3545; 
              border-top: none;
              padding: 20px; 
              border-radius: 0 0 8px 8px;
            }
            .details-box { 
              background-color: white; 
              border: 1px solid #ddd; 
              padding: 15px; 
              border-radius: 4px; 
              margin: 20px 0;
            }
            .action-buttons { text-align: center; margin: 30px 0; }
            .button { 
              display: inline-block; 
              padding: 12px 24px; 
              margin: 0 10px;
              text-decoration: none; 
              border-radius: 4px; 
            }
            .button-danger { background-color: #dc3545; color: white; }
            .button-success { background-color: #28a745; color: white; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
            .warning-icon { font-size: 48px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="alert-header">
              <div class="warning-icon">âš ï¸</div>
              <h2>Atividade Suspeita Detectada</h2>
            </div>
            <div class="alert-content">
              <p><strong>Detectamos uma tentativa de login suspeita em sua conta.</strong></p>
              
              <div class="details-box">
                <h3>Detalhes da Tentativa:</h3>
                <ul>
                  <li><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</li>
                  <li><strong>LocalizaÃ§Ã£o:</strong> ${data.location}</li>
                  <li><strong>Dispositivo:</strong> ${data.device}</li>
                  <li><strong>IP:</strong> ${data.ip}</li>
                  <li><strong>Tentativas falhas:</strong> 3</li>
                </ul>
              </div>
              
              <p><strong>O que fazer agora?</strong></p>
              <ul>
                <li>Se foi vocÃª tentando acessar, vocÃª pode ignorar este e-mail</li>
                <li>Se NÃƒO foi vocÃª, sua conta pode estar comprometida</li>
              </ul>
              
              <div class="action-buttons">
                <a href="https://app.onterapi.com/security/review" class="button button-success">Foi eu mesmo</a>
                <a href="https://app.onterapi.com/security/lock" class="button button-danger">NÃ£o fui eu - Bloquear conta</a>
              </div>
              
              <p style="background-color: #ffeaa7; padding: 15px; border-radius: 4px;">
                <strong>âš¡ AÃ§Ã£o recomendada:</strong> Se vocÃª nÃ£o reconhece esta atividade, 
                altere sua senha imediatamente e ative a autenticaÃ§Ã£o de dois fatores.
              </p>
            </div>
            <div class="footer">
              <p>Esta Ã© uma mensagem automÃ¡tica de seguranÃ§a. NÃ£o responda a este e-mail.</p>
              <p>Â© 2024 Onterapi. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getClinicAlertTemplate(data: ClinicAlertEmailData): string {
    const triggeredAt = data.triggeredAt.toISOString();
    const resolvedAt = data.resolvedAt ? data.resolvedAt.toISOString() : undefined;
    const payloadDetails = data.payload
      ? JSON.stringify(data.payload, null, 2)
      : 'Nenhum detalhe adicional fornecido.';
    const statusLabel = data.status === 'resolved' ? 'Alerta resolvido' : 'Alerta disparado';

    const resolutionBlock =
      data.status === 'resolved'
        ? `
      <h3 style="margin-top:24px;">Resumo da resolucao</h3>
      <ul style="padding-left:20px;">
        <li><strong>Responsavel:</strong> ${data.resolvedBy ?? 'Nao informado'}</li>
        <li><strong>Resolvido em:</strong> ${resolvedAt ?? 'Nao informado'}</li>
      </ul>
    `
        : '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 640px; margin: 0 auto; padding: 24px; background: #f7f7f7; border-radius: 8px; }
            .card { background: #ffffff; padding: 24px; border-radius: 6px; border: 1px solid #e0e0e0; }
            h2 { margin-top: 0; }
            pre { background: #1f2933; color: #f4f5f7; padding: 16px; border-radius: 4px; overflow-x: auto; font-size: 13px; }
            .meta { margin: 16px 0; padding: 16px; background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <h2>${statusLabel} - ${data.alertType}</h2>
              <p>Clinica: <strong>${data.clinicName}</strong></p>
              <div class="meta">
                <p><strong>Status:</strong> ${statusLabel}</p>
                <p><strong>Canal configurado:</strong> ${data.channel ?? 'Nao informado'}</p>
                <p><strong>Registrado em:</strong> ${triggeredAt}</p>
                <p><strong>Responsavel:</strong> ${data.triggeredBy ?? data.resolvedBy ?? 'Nao informado'}</p>
              </div>
              ${resolutionBlock}
              <h3>Detalhes do alerta</h3>
              <pre>${payloadDetails}</pre>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}
