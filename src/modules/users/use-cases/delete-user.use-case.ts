import { Injectable, Logger, Inject } from '@nestjs/common';
import { IDeleteUserUseCase } from '../../../domain/users/interfaces/use-cases/delete-user.use-case.interface';
import { ISupabaseAuthService } from '../../../domain/auth/interfaces/services/supabase-auth.service.interface';
import { AuthErrorFactory, AuthErrorType } from '../../../shared/factories/auth-error.factory';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';

@Injectable()
export class DeleteUserUseCase implements IDeleteUserUseCase {
  private readonly logger = new Logger(DeleteUserUseCase.name);

  constructor(
    @Inject(ISupabaseAuthService)
    private readonly supabaseAuthService: ISupabaseAuthService,
    private readonly messageBus: MessageBus,
  ) {}

  async execute(id: string, currentUserId: string): Promise<void> {
    try {
      const userResult = await this.supabaseAuthService.getUserById(id);
      
      if (userResult.error || !userResult.data) {
        throw AuthErrorFactory.create(AuthErrorType.USER_NOT_FOUND, { userId: id });
      }

      const deleteResult = await this.supabaseAuthService.deleteUser(id);
      
      if (deleteResult.error) {
        throw deleteResult.error;
      }

      this.logger.log(`Usuário deletado: ${userResult.data.email} por ${currentUserId}`);
      
      const event = DomainEvents.userDeleted(
        id,
        { deletedBy: currentUserId }
      );
      
      await this.messageBus.publish(event);
      this.logger.log(`Evento USER_DELETED publicado para usuário ${id}`);
    } catch (error) {
      this.logger.error('Erro ao deletar usuário', error);
      throw error;
    }
  }
}