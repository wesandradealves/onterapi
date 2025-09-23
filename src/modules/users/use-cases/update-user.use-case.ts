import { Inject, Injectable, Logger } from '@nestjs/common';
import { IUpdateUserUseCase } from '../../../domain/users/interfaces/use-cases/update-user.use-case.interface';
import { ISupabaseAuthService } from '../../../domain/auth/interfaces/services/supabase-auth.service.interface';
import { UserEntity } from '../../../infrastructure/auth/entities/user.entity';
import { UpdateUserDto } from '../api/dtos/update-user.dto';
import { updateUserSchema } from '../api/schemas/update-user.schema';
import { UseCaseWrapper } from '../../../shared/use-cases/use-case-wrapper';
import { AuthErrorFactory, AuthErrorType } from '../../../shared/factories/auth-error.factory';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';
import { Result } from '../../../shared/types/result.type';
import { MESSAGES } from '../../../shared/constants/messages.constants';

type UpdateUserInput = { id: string; dto: UpdateUserDto; currentUserId: string };

@Injectable()
export class UpdateUserUseCase implements IUpdateUserUseCase {
  private readonly logger = new Logger(UpdateUserUseCase.name);
  private readonly wrapper: UseCaseWrapper<UpdateUserInput, UserEntity>;

  constructor(
    @Inject(ISupabaseAuthService)
    private readonly supabaseAuthService: ISupabaseAuthService,
    private readonly messageBus: MessageBus,
  ) {
    this.wrapper = new UseCaseWrapper(this.logger, async (input: UpdateUserInput) =>
      this.handleUpdate(input),
    );
  }

  async execute(
    id: string,
    dto: UpdateUserDto,
    currentUserId: string,
  ): Promise<Result<UserEntity>> {
    return this.wrapper.execute({ id, dto, currentUserId });
  }

  private async handleUpdate(input: UpdateUserInput): Promise<UserEntity> {
    const { id, dto, currentUserId } = input;
    const validatedData = updateUserSchema.parse(dto);

    const userResult = await this.supabaseAuthService.getUserById(id);
    if (userResult.error || !userResult.data) {
      throw AuthErrorFactory.create(AuthErrorType.USER_NOT_FOUND, { userId: id });
    }

    const currentMetadata = (userResult.data as any).user_metadata || {};
    const updatedMetadata = {
      ...currentMetadata,
      ...validatedData,
      updatedBy: currentUserId,
      updatedAt: new Date().toISOString(),
    };

    const updateResult = await this.supabaseAuthService.updateUserMetadata(id, updatedMetadata);
    if (updateResult.error) {
      throw updateResult.error;
    }

    const updatedUser = updateResult.data;
    const metadata = (updatedUser as any).metadata || {};

    const user = {
      id: updatedUser.id,
      email: updatedUser.email,
      name: metadata.name || '',
      cpf: metadata.cpf || '',
      phone: metadata.phone || '',
      role: metadata.role || 'PATIENT',
      tenantId: metadata.tenantId || null,
      isActive: metadata.isActive !== false,
      emailVerified: updatedUser.emailVerified,
      twoFactorEnabled: metadata.twoFactorEnabled || false,
      lastLoginAt: null,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    } as unknown as UserEntity;

    this.logger.log(`${MESSAGES.LOGS.USER_UPDATED}: ${user.email} por ${currentUserId}`);

    const event = DomainEvents.userUpdated(id, validatedData, { userId: currentUserId });

    await this.messageBus.publish(event);
    this.logger.log(`${MESSAGES.EVENTS.USER_UPDATED} para ${id}`);

    return user;
  }
}
