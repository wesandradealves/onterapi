import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import {
  WelcomeEmailData,
  SuspiciousLoginData
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
      this.logger.log('Email service connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to email service', error);
    }
  }

  private async sendEmail(options: EmailOptions): Promise<Result<void>> {
    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        ...options,
      });
      
      this.logger.log(`Email sent: ${info.messageId}`);
      return { data: undefined };
    } catch (error) {
      this.logger.error(MESSAGES.ERRORS.EMAIL.SEND_ERROR, error);
      return { error: error as Error };
    }
  }

  async sendWelcomeEmail(data: WelcomeEmailData): Promise<Result<void>> {
    const subject = 'Bem-vindo à Onterapi!';
    const html = this.getWelcomeEmailTemplate(data);
    
    return this.sendEmail({
      to: data.to,
      subject,
      html,
    });
  }

  async sendSuspiciousLoginEmail(data: SuspiciousLoginData): Promise<Result<void>> {
    const subject = '⚠️ Atividade suspeita detectada - Onterapi';
    const html = this.getSuspiciousLoginTemplate(data);
    
    return this.sendEmail({
      to: data.to,
      subject,
      html,
    });
  }

  private getWelcomeEmailTemplate(data: WelcomeEmailData): string {
    const roleNames: Record<string, string> = {
      USER: 'Usuário',
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
              <h1>🎉 Bem-vindo à Onterapi!</h1>
            </div>
            <div class="content">
              <h2>Olá, ${data.name}!</h2>
              <p>É com grande prazer que damos as boas-vindas à plataforma Onterapi.</p>
              <p>Sua conta foi criada com sucesso com o perfil: <strong>${roleName}</strong></p>
              
              <div class="features">
                <h3>O que você pode fazer agora:</h3>
                <div class="feature-item">✅ Acessar o painel de controle</div>
                <div class="feature-item">✅ Configurar seu perfil</div>
                <div class="feature-item">✅ Explorar os recursos disponíveis</div>
                <div class="feature-item">✅ Personalizar suas preferências</div>
              </div>
              
              <div style="text-align: center;">
                <a href="https://app.onterapi.com/dashboard" class="cta-button">Acessar Plataforma</a>
              </div>
              
              <p><strong>Dicas para começar:</strong></p>
              <ul>
                <li>Complete seu perfil para uma experiência personalizada</li>
                <li>Explore a documentação para conhecer todos os recursos</li>
                <li>Configure as notificações de acordo com suas preferências</li>
              </ul>
            </div>
            <div class="footer">
              <p>Precisa de ajuda? Entre em contato conosco: suporte@onterapi.com</p>
              <p>© 2024 Onterapi. Todos os direitos reservados.</p>
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
              <div class="warning-icon">⚠️</div>
              <h2>Atividade Suspeita Detectada</h2>
            </div>
            <div class="alert-content">
              <p><strong>Detectamos uma tentativa de login suspeita em sua conta.</strong></p>
              
              <div class="details-box">
                <h3>Detalhes da Tentativa:</h3>
                <ul>
                  <li><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</li>
                  <li><strong>Localização:</strong> ${data.location}</li>
                  <li><strong>Dispositivo:</strong> ${data.device}</li>
                  <li><strong>IP:</strong> ${data.ip}</li>
                  <li><strong>Tentativas falhas:</strong> 3</li>
                </ul>
              </div>
              
              <p><strong>O que fazer agora?</strong></p>
              <ul>
                <li>Se foi você tentando acessar, você pode ignorar este e-mail</li>
                <li>Se NÃO foi você, sua conta pode estar comprometida</li>
              </ul>
              
              <div class="action-buttons">
                <a href="https://app.onterapi.com/security/review" class="button button-success">Foi eu mesmo</a>
                <a href="https://app.onterapi.com/security/lock" class="button button-danger">Não fui eu - Bloquear conta</a>
              </div>
              
              <p style="background-color: #ffeaa7; padding: 15px; border-radius: 4px;">
                <strong>⚡ Ação recomendada:</strong> Se você não reconhece esta atividade, 
                altere sua senha imediatamente e ative a autenticação de dois fatores.
              </p>
            </div>
            <div class="footer">
              <p>Esta é uma mensagem automática de segurança. Não responda a este e-mail.</p>
              <p>© 2024 Onterapi. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}