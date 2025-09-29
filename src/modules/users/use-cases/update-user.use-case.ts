import { Inject, Injectable, Logger } from '@nestjs/common';
import { IUpdateUserUseCase } from '../../../domain/users/interfaces/use-cases/update-user.use-case.interface';
import { ISupabaseAuthService } from '../../../domain/auth/interfaces/services/supabase-auth.service.interface';
import { IUserRepository } from '../../../domain/users/interfaces/repositories/user.repository.interface';
import { UserEntity } from '../../../infrastructure/auth/entities/user.entity';
import { IUpdateUser } from '../../../domain/users/types/user.types';
import { UseCaseWrapper } from '../../../shared/use-cases/use-case-wrapper';
import { AuthErrorFactory, AuthErrorType } from '../../../shared/factories/auth-error.factory';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';
import { Result } from '../../../shared/types/result.type';
import { MESSAGES } from '../../../shared/constants/messages.constants';

type UpdateUserInput = { slug: string; dto: IUpdateUser; currentUserId: string };

type SupabaseUser = {
  id: string;
  email: string;
  emailVerified?: boolean;
  user_metadata?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  updatedAt?: string | Date;
  createdAt?: string | Date;
};

@Injectable()
export class UpdateUserUseCase implements IUpdateUserUseCase {
  private readonly logger = new Logger(UpdateUserUseCase.name);
  private readonly wrapper: UseCaseWrapper<UpdateUserInput, UserEntity>;

  constructor(
    @Inject(ISupabaseAuthService)
    private readonly supabaseAuthService: ISupabaseAuthService,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly messageBus: MessageBus,
  ) {
    this.wrapper = new UseCaseWrapper(this.logger, async (input: UpdateUserInput) =>
      this.handleUpdate(input),
    );
  }

  async execute(
    slug: string,
    dto: IUpdateUser,
    currentUserId: string,
  ): Promise<Result<UserEntity>> {
    return this.wrapper.execute({ slug, dto, currentUserId });
  }

  async executeOrThrow(slug: string, dto: IUpdateUser, currentUserId: string): Promise<UserEntity> {
    return this.wrapper.executeOrThrow({ slug, dto, currentUserId });
  }

  private async handleUpdate(input: UpdateUserInput): Promise<UserEntity> {
    const { slug, dto, currentUserId } = input;

    const user = await this.userRepository.findBySlug(slug);
    if (!user) {
      throw AuthErrorFactory.create(AuthErrorType.USER_NOT_FOUND, { slug });
    }

    const userResult = await this.supabaseAuthService.getUserById(user.supabaseId);
    if (userResult.error || !userResult.data) {
      throw AuthErrorFactory.create(AuthErrorType.USER_NOT_FOUND, { userId: user.supabaseId });
    }

    const supabaseUser = userResult.data as SupabaseUser;
    const currentMetadata = (supabaseUser.user_metadata || supabaseUser.metadata || {}) as Record<
      string,
      unknown
    >;

    const updatedMetadata = {
      ...currentMetadata,
      ...dto,
      slug: user.slug,
      updatedBy: currentUserId,
      updatedAt: new Date().toISOString(),
    };

    const updateResult = await this.supabaseAuthService.updateUserMetadata(
      user.supabaseId,
      updatedMetadata,
    );
    if (updateResult.error) {
      throw updateResult.error;
    }

    await this.userRepository.update(user.id, {
      name: typeof dto.name === 'string' ? dto.name : user.name,
      phone: typeof dto.phone === 'string' ? dto.phone : user.phone,
      isActive: typeof dto.isActive === 'boolean' ? dto.isActive : user.isActive,
      metadata: updatedMetadata,
      emailVerified: (updateResult.data as SupabaseUser).emailVerified ?? user.emailVerified,
      updatedAt: new Date(),
    });

    const refreshed = await this.userRepository.findBySlug(user.slug);
    if (!refreshed) {
      throw AuthErrorFactory.create(AuthErrorType.USER_NOT_FOUND, { slug });
    }

    this.logger.log(`${MESSAGES.LOGS.USER_UPDATED}: ${refreshed.email} por ${currentUserId}`);

    const event = DomainEvents.userUpdated(refreshed.id, { ...dto } as Record<string, unknown>, {
      userId: currentUserId,
    });

    await this.messageBus.publish(event);
    this.logger.log(`${MESSAGES.EVENTS.USER_UPDATED} para ${refreshed.id}`);

    return refreshed;
  }
}
