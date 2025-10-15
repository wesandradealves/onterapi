import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
  ClinicAlertEmailData,
  ClinicOverbookingEmailData,
  ClinicPaymentEmailData,
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

  async sendClinicPaymentEmail(data: ClinicPaymentEmailData): Promise<Result<void>> {
    const statusLabel = this.resolvePaymentStatusLabel(data.status);
    const subject = `[Onterapi] Notificacao de pagamento - ${statusLabel}`;
    const html = this.getClinicPaymentTemplate(data, statusLabel);

    return this.sendEmail({
      to: data.to,
      subject,
      html,
    });
  }

  async sendClinicOverbookingEmail(data: ClinicOverbookingEmailData): Promise<Result<void>> {
    const statusLabel = this.resolveOverbookingStatusLabel(data.status);
    const subject = `[Onterapi] Overbooking - ${statusLabel}`;
    const html = this.getClinicOverbookingTemplate(data, statusLabel);

    return this.sendEmail({
      to: data.to,
      subject,
      html,
    });
  }

  private resolveOverbookingStatusLabel(status: ClinicOverbookingEmailData['status']): string {
    switch (status) {
      case 'review_requested':
        return 'Revisao pendente';
      case 'approved':
        return 'Overbooking aprovado';
      case 'rejected':
        return 'Overbooking rejeitado';
      default:
        return 'Atualizacao de overbooking';
    }
  }

  private getClinicOverbookingTemplate(
    data: ClinicOverbookingEmailData,
    statusLabel: string,
  ): string {
    const clinicName = data.clinicName || 'Clinica';
    const requestedAt = this.formatDateTime(data.requestedAt);
    const reviewedAt = this.formatDateTime(data.reviewedAt);
    const justification =
      data.status !== 'review_requested' && data.justification
        ? `<li><strong>Justificativa:</strong> ${data.justification}</li>`
        : '';
    const reviewInfo =
      data.status !== 'review_requested'
        ? `
            <li><strong>Revisado por:</strong> ${data.reviewedBy ?? 'N/D'}</li>
            <li><strong>Data da revisao:</strong> ${reviewedAt ?? 'N/D'}</li>
          `
        : '';
    const reasons =
      data.reasons && data.reasons.length > 0
        ? `<li><strong>Fatores considerados:</strong> ${data.reasons.join(', ')}</li>`
        : '';
    const contextBlock = data.context
      ? `
          <div class="details">
            <strong>Contexto adicional</strong>
            <pre>${JSON.stringify(data.context, null, 2)}</pre>
          </div>
        `
      : '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; background: #f5f7fa; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 24px; }
            .card { background: #ffffff; border-radius: 8px; padding: 24px; box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); }
            .header { border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; }
            .header h2 { margin: 0; color: #1e293b; font-size: 20px; }
            .content ul { list-style: none; padding: 0; margin: 0; }
            .content li { margin: 8px 0; }
            .footer { margin-top: 24px; font-size: 12px; color: #64748b; text-align: center; }
            .details { margin-top: 16px; }
            .details pre { background: #f1f5f9; padding: 12px; border-radius: 6px; overflow: auto; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <h2>${statusLabel}</h2>
                <p>${clinicName}</p>
              </div>
              <div class="content">
                <ul>
                  <li><strong>Hold:</strong> ${data.holdId}</li>
                  <li><strong>Profissional:</strong> ${data.professionalId}</li>
                  <li><strong>Paciente:</strong> ${data.patientId}</li>
                  <li><strong>Servico:</strong> ${data.serviceTypeId}</li>
                  <li><strong>Risco calculado:</strong> ${data.riskScore}%</li>
                  <li><strong>Limiar da clinica:</strong> ${data.threshold}%</li>
                  <li><strong>Solicitado por:</strong> ${data.requestedBy ?? 'N/D'}</li>
                  <li><strong>Data da solicitacao:</strong> ${requestedAt ?? 'N/D'}</li>
                  ${reviewInfo}
                  ${justification}
                  ${reasons}
                </ul>
                ${contextBlock}
              </div>
              <div class="footer">
                <p>Este e-mail foi enviado automaticamente. Nao responda.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
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

  private resolvePaymentStatusLabel(status: ClinicPaymentEmailData['status']): string {
    switch (status) {
      case 'settled':
        return 'Pagamento liquidado';
      case 'refunded':
        return 'Pagamento reembolsado';
      case 'chargeback':
        return 'Chargeback registrado';
      default:
        return 'Atualizacao de pagamento';
    }
  }

  private getClinicPaymentTemplate(data: ClinicPaymentEmailData, statusLabel: string): string {
    const clinicName = data.clinicName || 'Clinica';
    const eventDate = data.eventAt.toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
    const amount =
      data.amountCents !== undefined ? this.formatCurrency(data.amountCents / 100) : 'N/D';
    const netAmount =
      data.netAmountCents !== undefined && data.netAmountCents !== null
        ? this.formatCurrency(data.netAmountCents / 100)
        : null;
    const serviceInfo = data.serviceType
      ? `<li><strong>Servico:</strong> ${data.serviceType}</li>`
      : '';
    const netInfo = netAmount ? `<li><strong>Valor liquido:</strong> ${netAmount}</li>` : '';
    const details = this.renderDetails(data.details);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; background: #f5f7fa; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 24px; }
            .card { background: #ffffff; border-radius: 8px; padding: 24px; box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); }
            .header { border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; }
            .header h2 { margin: 0; color: #1e293b; font-size: 20px; }
            .content ul { list-style: none; padding: 0; margin: 0; }
            .content li { margin: 8px 0; }
            .footer { margin-top: 24px; font-size: 12px; color: #64748b; text-align: center; }
            .details { margin-top: 16px; }
            .details pre { background: #f1f5f9; padding: 12px; border-radius: 6px; overflow: auto; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <h2>${statusLabel}</h2>
                <p>${clinicName}</p>
              </div>
              <div class="content">
                <ul>
                  <li><strong>Transacao:</strong> ${data.transactionId}</li>
                  <li><strong>Status:</strong> ${statusLabel}</li>
                  <li><strong>Data do evento:</strong> ${eventDate}</li>
                  <li><strong>Valor bruto:</strong> ${amount}</li>
                  ${netInfo}
                  ${serviceInfo}
                </ul>
                ${details}
              </div>
              <div class="footer">
                <p>Este e-mail foi enviado automaticamente. Nao responda.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private renderDetails(details: Record<string, unknown> | undefined): string {
    if (!details || Object.keys(details).length === 0) {
      return '';
    }

    const formatted = JSON.stringify(details, null, 2);
    return `
      <div class="details">
        <strong>Detalhes adicionais</strong>
        <pre>${formatted}</pre>
      </div>
    `;
  }

  private formatDateTime(value?: Date | string): string | null {
    if (!value) {
      return null;
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date.toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }

  private formatCurrency(value: number): string {
    try {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(value);
    } catch {
      return `R$ ${value.toFixed(2)}`;
    }
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
