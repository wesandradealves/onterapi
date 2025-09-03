import { Injectable, ConflictException, Logger, Inject } from '@nestjs/common';
import { ICreateUserUseCase } from '../../../domain/users/interfaces/use-cases/create-user.use-case.interface';
import { IUserRepository } from '../../../domain/users/interfaces/repositories/user.repository.interface';
import { UserEntity } from '../../../infrastructure/auth/entities/user.entity';
import { CreateUserInputDTO } from '../api/dtos/create-user.dto';
import { createUserSchema } from '../api/schemas/create-user.schema';
import { hashPassword } from '../../../shared/utils/crypto.util';
import { SupabaseService } from '../../../infrastructure/auth/services/supabase.service';
import { ISupabaseAuthService } from '../../../domain/auth/interfaces/services/supabase-auth.service.interface';
import { IEmailService } from '../../../domain/auth/interfaces/services/email.service.interface';
import { IJwtService } from '../../../domain/auth/interfaces/services/jwt.service.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CreateUserUseCase implements ICreateUserUseCase {
  private readonly logger = new Logger(CreateUserUseCase.name);

  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly supabaseService: SupabaseService,
    @Inject(ISupabaseAuthService)
    private readonly supabaseAuthService: ISupabaseAuthService,
    @Inject(IEmailService)
    private readonly emailService: IEmailService,
    @Inject(IJwtService)
    private readonly jwtService: IJwtService,
    private readonly configService: ConfigService,
  ) {}

  async execute(dto: CreateUserInputDTO): Promise<UserEntity> {
    try {
      const validatedData = createUserSchema.parse(dto);


      const roleForDB = validatedData.role.toLowerCase().replace(/_/g, '_');
      
      // Usar o SupabaseAuthService que tem o método signUp com envio de email
      const result = await this.supabaseAuthService.signUp({
        email: validatedData.email,
        password: validatedData.password,
        metadata: {
          name: validatedData.name,
          role: validatedData.role,
          cpf: validatedData.cpf,
          phone: validatedData.phone,
          tenantId: validatedData.tenantId,
          isActive: true,
        }
      });
      
      const supabaseUser = result.data;
      const error = result.error;

      if (error || !supabaseUser) {
        this.logger.error('Erro ao criar usuário no Supabase', error);
        throw new Error('Erro ao criar usuário no Supabase: ' + (error?.message || 'Erro desconhecido'));
      }

      
      this.logger.log(`Usuário criado com sucesso no Supabase: ${supabaseUser.email}`);
      
      // Gerar nosso próprio token de verificação
      const verificationToken = this.generateVerificationToken();
      
      const baseUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3001';
      const verificationLink = `${baseUrl}/auth/verify-email?token=${verificationToken}&email=${supabaseUser.email}`;
      
      this.logger.warn(`
========================================
📧 EMAIL DE CONFIRMAÇÃO
👤 Usuário: ${validatedData.name}
📬 Email: ${supabaseUser.email}
🔑 Token: ${verificationToken}
🔗 Link: ${verificationLink}
========================================
      `);
      
      // Enviar nosso próprio email de verificação
      const emailResult = await this.emailService.sendVerificationEmail({
        to: supabaseUser.email,
        name: validatedData.name,
        verificationLink,
        expiresIn: '24 horas',
      });
      
      if (emailResult.error) {
        this.logger.error('Erro ao enviar email de verificação', emailResult.error);
      } else {
        this.logger.log(`Email de verificação enviado para ${supabaseUser.email}`);
      }
      
      // Salvar o token no banco de dados
      await this.saveVerificationToken(supabaseUser.id, supabaseUser.email, verificationToken);

      // Enviar email de boas-vindas também
      await this.emailService.sendWelcomeEmail({
        to: supabaseUser.email || '',
        name: validatedData.name,
        role: validatedData.role,
      });

      return {
        id: supabaseUser.id,
        email: supabaseUser.email,
        name: validatedData.name,
        cpf: validatedData.cpf,
        phone: validatedData.phone,
        role: validatedData.role,
        tenantId: validatedData.tenantId,
        isActive: true,
        emailVerified: false, // Começa como não verificado
        createdAt: supabaseUser.createdAt,
        updatedAt: supabaseUser.updatedAt,
      } as UserEntity;
    } catch (error) {
      this.logger.error('Erro ao criar usuário', error);
      throw error;
    }
  }

  private generateVerificationToken(): string {
    const randomBytes = require('crypto').randomBytes(32);
    return randomBytes.toString('hex');
  }

  private async saveVerificationToken(userId: string, email: string, token: string): Promise<void> {
    try {
      const { Client } = require('pg');
      const client = new Client({
        host: 'aws-0-sa-east-1.pooler.supabase.com',
        port: 6543,
        database: 'postgres',
        user: 'postgres.ogffdaemylaezxpunmop',
        password: '5lGR6N9OyfF1fcMc',
        ssl: {
          rejectUnauthorized: false
        }
      });

      await client.connect();
      
      // Token expira em 24 horas
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      const query = `
        INSERT INTO email_verification_tokens (user_id, email, token, expires_at)
        VALUES ($1, $2, $3, $4)
      `;
      
      await client.query(query, [userId, email, token, expiresAt]);
      await client.end();
      
      this.logger.log(`Token de verificação salvo para ${email}`);
    } catch (error) {
      this.logger.error('Erro ao salvar token de verificação:', error);
      // Não lançar erro para não impedir criação do usuário
    }
  }
}