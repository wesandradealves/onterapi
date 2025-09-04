import { Injectable, Logger, Inject } from '@nestjs/common';
import { IDeleteUserUseCase } from '../../../domain/users/interfaces/use-cases/delete-user.use-case.interface';
import { ISupabaseAuthService } from '../../../domain/auth/interfaces/services/supabase-auth.service.interface';
import { UseCaseWrapper } from '../../../shared/use-cases/use-case-wrapper';
import { AuthErrorFactory, AuthErrorType } from '../../../shared/factories/auth-error.factory';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';
import { Result } from '../../../shared/types/result.type';
import { MESSAGES } from '../../../shared/constants/messages.constants';

type DeleteUserInput = { id: string; currentUserId: string };

@Injectable()
export class DeleteUserUseCase implements IDeleteUserUseCase {
  private readonly logger = new Logger(DeleteUserUseCase.name);
  private readonly wrapper: UseCaseWrapper<DeleteUserInput, void>;

  constructor(
    @Inject(ISupabaseAuthService)
    private readonly supabaseAuthService: ISupabaseAuthService,
    private readonly messageBus: MessageBus,
  ) {
    this.wrapper = new UseCaseWrapper(
      this.logger,
      async (input: DeleteUserInput) => this.handleDelete(input)
    );
  }

  async execute(id: string, currentUserId: string): Promise<Result<void>> {
    return this.wrapper.execute({ id, currentUserId });
  }

  private async handleDelete(input: DeleteUserInput): Promise<void> {
      const { id, currentUserId } = input;
      const userResult = await this.supabaseAuthService.getUserById(id);
      
      if (userResult.error || !userResult.data) {
        throw AuthErrorFactory.create(AuthErrorType.USER_NOT_FOUND, { userId: id });
      }

      const deleteResult = await this.supabaseAuthService.deleteUser(id);
      
      if (deleteResult.error) {
        throw deleteResult.error;
      }

      this.logger.log(`${MESSAGES.LOGS.USER_DELETED_LOG}: ${userResult.data.email} por ${currentUserId}`);
      
      const event = DomainEvents.userDeleted(
        id,
        { deletedBy: currentUserId }
      );
      
      await this.messageBus.publish(event);
      this.logger.log(`${MESSAGES.EVENTS.USER_DELETED} para ${id}`);
  }
}