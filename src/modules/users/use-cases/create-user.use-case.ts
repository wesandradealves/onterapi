import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { ICreateUserUseCase } from '../../../domain/users/interfaces/use-cases/create-user.use-case.interface';
import { IUserRepository } from '../../../domain/users/interfaces/repositories/user.repository.interface';
import { UserEntity } from '../../../infrastructure/auth/entities/user.entity';
import { CreateUserInputDTO } from '../api/dtos/create-user.dto';
import { createUserSchema } from '../api/schemas/create-user.schema';
import { SupabaseService } from '../../../infrastructure/auth/services/supabase.service';
import { ISupabaseAuthService } from '../../../domain/auth/interfaces/services/supabase-auth.service.interface';
import { IEmailService } from '../../../domain/auth/interfaces/services/email.service.interface';
import { IJwtService } from '../../../domain/auth/interfaces/services/jwt.service.interface';
import { ConfigService } from '@nestjs/config';
import { generateSecureToken, hashPassword } from '../../../shared/utils/crypto.util';
import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import { Result } from '../../../shared/types/result.type';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';
import { AuthErrorFactory } from '../../../shared/factories/auth-error.factory';
import { MESSAGES } from '../../../shared/constants/messages.constants';
import { appendSlugSuffix, slugify } from '../../../shared/utils/slug.util';

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

    const baseSlug = slugify(validatedData.name);
    let slug = baseSlug;
    let counter = 1;

    while (await this.userRepository.findBySlug(slug)) {
      slug = appendSlugSuffix(baseSlug, ++counter);
    }

    const metadataPayload = {
      name: validatedData.name,
      role: validatedData.role,
      cpf: validatedData.cpf,
      phone: validatedData.phone,
      tenantId: validatedData.tenantId,
      isActive: true,
      slug,
    };

    const existingUser = await this.userRepository.findByCpf(validatedData.cpf);

    if (existingUser) {
      this.logger.warn(MESSAGES.USER.CPF_DUPLICATE);
      throw new ConflictException(MESSAGES.USER.CPF_DUPLICATE);
    }

    this.logger.log(MESSAGES.USER.CPF_AVAILABLE);

    const passwordHash = await hashPassword(validatedData.password);

    const result = await this.supabaseAuthService.signUp({
      email: validatedData.email,
      password: validatedData.password,
      metadata: metadataPayload,
    });

    const supabaseUser = result.data;
    const error = result.error;

    if (error || !supabaseUser) {
      this.logger.error(MESSAGES.ERRORS.SUPABASE.CREATE_ERROR, error);
      throw AuthErrorFactory.internalServerError(MESSAGES.ERRORS.SUPABASE.CREATE_ERROR);
    }

    this.logger.log(`${MESSAGES.USER.CREATED}: ${supabaseUser.email}`);

    const verificationToken = this.generateVerificationToken();

    const baseUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
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

    const savedUser = await this.userRepository.create({
      supabaseId: supabaseUser.id,
      slug,
      email: supabaseUser.email || validatedData.email,
      name: validatedData.name,
      cpf: validatedData.cpf,
      phone: validatedData.phone ?? undefined,
      role: validatedData.role,
      tenantId: validatedData.tenantId,
      isActive: true,
      emailVerified: false,
      metadata: metadataPayload,
      password_hash: passwordHash,
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
        slug,
      },
      { userId: supabaseUser.id, slug },
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
        slug,
      },
      { userId: supabaseUser.id, slug },
    );

    await this.messageBus.publish(userRegisteredEvent);
    this.logger.log(`Evento USER_REGISTERED publicado para ${supabaseUser.email}`);

    return savedUser;
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

