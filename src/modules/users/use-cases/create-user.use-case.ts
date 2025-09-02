import { Injectable, ConflictException, Logger, Inject } from '@nestjs/common';
import { ICreateUserUseCase } from '../../../domain/users/interfaces/use-cases/create-user.use-case.interface';
import { IUserRepository } from '../../../domain/users/interfaces/repositories/user.repository.interface';
import { UserEntity } from '../../../infrastructure/auth/entities/user.entity';
import { CreateUserInputDTO } from '../api/dtos/create-user.dto';
import { createUserSchema } from '../api/schemas/create-user.schema';
import { hashPassword } from '../../../shared/utils/crypto.util';
import { SupabaseService } from '../../../infrastructure/auth/services/supabase.service';
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
      
      const { user: supabaseUser, error } = await this.supabaseService.createUser(
        validatedData.email,
        validatedData.password,
        {
          name: validatedData.name,
          role: validatedData.role,
          cpf: validatedData.cpf,
        }
      );

      if (error || !supabaseUser) {
        this.logger.error('Erro ao criar usuário no Supabase', error);
        throw new Error('Erro ao criar usuário no Supabase: ' + (error?.message || 'Erro desconhecido'));
      }

      
      this.logger.log(`Usuário criado com sucesso no Supabase: ${supabaseUser.email}`);

      const verificationToken = this.generateVerificationToken();
      
      
      const baseUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3001';
      const verificationLink = `${baseUrl}/auth/verify-email?token=${verificationToken}&email=${supabaseUser.email}`;

      this.logger.warn(`
========================================
📧 EMAIL DE CONFIRMAÇÃO GERADO
👤 Usuário: ${validatedData.name}
📬 Email: ${supabaseUser.email}
🔑 Token de Verificação: ${verificationToken}
🔗 Link de Verificação: ${verificationLink}
⏰ Expira em: 24 horas
========================================
      `);

      const emailResult = await this.emailService.sendVerificationEmail({
        to: supabaseUser.email || '',
        name: validatedData.name,
        verificationLink,
        expiresIn: '24 horas',
      });

      if (emailResult.error) {
        this.logger.error('Erro ao enviar email de verificação', emailResult.error);
        // Don't throw error, user was created successfully
      } else {
        this.logger.log(`Email de verificação enviado para ${supabaseUser.email}`);
      }

      // Send welcome email too
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
        emailVerified: true,
        createdAt: new Date(supabaseUser.created_at),
        updatedAt: new Date(supabaseUser.created_at),
      } as UserEntity;
    } catch (error) {
      this.logger.error('Erro ao criar usuário', error);
      throw error;
    }
  }

  private generateVerificationToken(): string {
    // Generate a random token
    const randomBytes = require('crypto').randomBytes(32);
    return randomBytes.toString('hex');
  }
}