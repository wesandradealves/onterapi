import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { UserMapper } from '../../../shared/mappers/user.mapper';
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
import { generateSecureToken } from '../../../shared/utils/crypto.util';
import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import { Result } from '../../../shared/types/result.type';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';
import { AuthErrorFactory } from '../../../shared/factories/auth-error.factory';
import { MESSAGES } from '../../../shared/constants/messages.constants';

@Injectable()
export class CreateUserUseCase
  extends BaseUseCase<CreateUserInputDTO, UserEntity>
  implements ICreateUserUseCase
{
  protected readonly logger = new Logger(CreateUserUseCase.name);

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
    private readonly messageBus: MessageBus,
  ) {
    super();
  }

  async execute(dto: CreateUserInputDTO): Promise<Result<UserEntity>> {
    return super.execute(dto);
  }

  protected async handle(dto: CreateUserInputDTO): Promise<UserEntity> {
    const validatedData = createUserSchema.parse(dto);

    this.logger.log(MESSAGES.VALIDATION.CHECKING_CPF);

    const listResult = await this.supabaseAuthService.listUsers({ perPage: 1000 });
    const allUsers = listResult.data?.users ?? [];

    if (listResult.error) {
      this.logger.error(MESSAGES.ERRORS.SUPABASE.LIST_ERROR, listResult.error);
    }

    this.logger.log(MESSAGES.VALIDATION.TOTAL_USERS + ': ' + allUsers.length);

    const existingUserWithCpf = allUsers.find((user) => {
      const userCpf = user.user_metadata?.cpf;
      this.logger.log(MESSAGES.VALIDATION.COMPARING_CPF);
      return userCpf === validatedData.cpf;
    });

    if (existingUserWithCpf) {
      this.logger.warn(MESSAGES.USER.CPF_DUPLICATE);
      throw new ConflictException(MESSAGES.USER.CPF_DUPLICATE);
    }

    this.logger.log(MESSAGES.USER.CPF_AVAILABLE);

    const roleForDB = validatedData.role.toLowerCase().replace(/_/g, '_');

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
      },
    });

    const supabaseUser = result.data;
    const error = result.error;

    if (error || !supabaseUser) {
      this.logger.error(MESSAGES.ERRORS.SUPABASE.CREATE_ERROR, error);
      throw AuthErrorFactory.internalServerError(MESSAGES.ERRORS.SUPABASE.CREATE_ERROR);
    }

    this.logger.log(`${MESSAGES.USER.CREATED}: ${supabaseUser.email}`);

    const verificationToken = this.generateVerificationToken();

    const baseUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3001';
    const verificationLink = `${baseUrl}/auth/verify-email?token=${verificationToken}&email=${supabaseUser.email}`;

    const emailResult = await this.emailService.sendVerificationEmail({
      to: supabaseUser.email,
      name: validatedData.name,
      verificationLink,
      expiresIn: '24 horas',
    });

    if (emailResult.error) {
      this.logger.error(MESSAGES.ERRORS.EMAIL.SEND_ERROR, emailResult.error);
    } else {
      this.logger.log(`${MESSAGES.AUTH.VERIFICATION_EMAIL_SENT} para ${supabaseUser.email}`);
    }

    await this.saveVerificationToken(supabaseUser.id, supabaseUser.email, verificationToken);

    await this.emailService.sendWelcomeEmail({
      to: supabaseUser.email || '',
      name: validatedData.name,
      role: validatedData.role,
    });

    const userCreatedEvent = DomainEvents.userCreated(
      supabaseUser.id,
      {
        email: supabaseUser.email,
        name: validatedData.name,
        role: validatedData.role,
        cpf: validatedData.cpf,
        phone: validatedData.phone,
        tenantId: validatedData.tenantId,
      },
      { userId: supabaseUser.id },
    );

    await this.messageBus.publish(userCreatedEvent);
    this.logger.log(`Evento USER_CREATED publicado para ${supabaseUser.email}`);

    const userRegisteredEvent = DomainEvents.userRegistered(
      supabaseUser.id,
      {
        email: supabaseUser.email,
        name: validatedData.name,
        role: validatedData.role,
        registeredAt: new Date().toISOString(),
      },
      { userId: supabaseUser.id },
    );

    await this.messageBus.publish(userRegisteredEvent);
    this.logger.log(`Evento USER_REGISTERED publicado para ${supabaseUser.email}`);

    const userWithMetadata = {
      ...supabaseUser,
      user_metadata: {
        name: validatedData.name,
        cpf: validatedData.cpf,
        phone: validatedData.phone,
        role: validatedData.role,
        tenantId: validatedData.tenantId,
        isActive: true,
      },
    };

    return UserMapper.fromSupabaseToEntity(userWithMetadata);
  }

  private generateVerificationToken(): string {
    return generateSecureToken(32);
  }

  private async saveVerificationToken(userId: string, email: string, token: string): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      await this.supabaseService.getClient().from('email_verification_tokens').insert({
        user_id: userId,
        email: email,
        token: token,
        expires_at: expiresAt.toISOString(),
      });

      this.logger.log(MESSAGES.LOGS.TOKEN_VERIFICATION_SAVED);
    } catch (error) {
      this.logger.error(MESSAGES.LOGS.TOKEN_VERIFICATION_ERROR, error);
    }
  }
}
