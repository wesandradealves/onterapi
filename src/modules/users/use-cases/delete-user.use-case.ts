import { Inject, Injectable, Logger } from '@nestjs/common';
import { IDeleteUserUseCase } from '../../../domain/users/interfaces/use-cases/delete-user.use-case.interface';
import { ISupabaseAuthService } from '../../../domain/auth/interfaces/services/supabase-auth.service.interface';
import { IUserRepository } from '../../../domain/users/interfaces/repositories/user.repository.interface';
import { UseCaseWrapper } from '../../../shared/use-cases/use-case-wrapper';
import { AuthErrorFactory, AuthErrorType } from '../../../shared/factories/auth-error.factory';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';
import { Result } from '../../../shared/types/result.type';
import { MESSAGES } from '../../../shared/constants/messages.constants';

type DeleteUserInput = { slug: string; currentUserId: string };

@Injectable()
export class DeleteUserUseCase implements IDeleteUserUseCase {
  private readonly logger = new Logger(DeleteUserUseCase.name);
  private readonly wrapper: UseCaseWrapper<DeleteUserInput, void>;

  constructor(
    @Inject(ISupabaseAuthService)
    private readonly supabaseAuthService: ISupabaseAuthService,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly messageBus: MessageBus,
  ) {
    this.wrapper = new UseCaseWrapper(this.logger, async (input: DeleteUserInput) =>
      this.handleDelete(input),
    );
  }

  async execute(slug: string, currentUserId: string): Promise<Result<void>> {
    return this.wrapper.execute({ slug, currentUserId });
  }

  private async handleDelete(input: DeleteUserInput): Promise<void> {
    const { slug, currentUserId } = input;
    const user = await this.userRepository.findBySlug(slug);

    if (!user) {
      throw AuthErrorFactory.create(AuthErrorType.USER_NOT_FOUND, { slug });
    }

    const deleteResult = await this.supabaseAuthService.deleteUser(user.supabaseId);

    if (deleteResult.error) {
      throw deleteResult.error;
    }

    await this.userRepository.softDelete(user.id);

    this.logger.log(`${MESSAGES.LOGS.USER_DELETED_LOG}: ${user.email} por ${currentUserId}`);

    const event = DomainEvents.userDeleted(user.id, { deletedBy: currentUserId, slug: user.slug });

    await this.messageBus.publish(event);
    this.logger.log(`${MESSAGES.EVENTS.USER_DELETED} para ${user.id}`);
  }
}
