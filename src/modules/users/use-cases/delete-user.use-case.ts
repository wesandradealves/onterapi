import { Injectable, NotFoundException, Logger, Inject } from '@nestjs/common';
import { IDeleteUserUseCase } from '../../../domain/users/interfaces/use-cases/delete-user.use-case.interface';
import { IUserRepository } from '../../../domain/users/interfaces/repositories/user.repository.interface';
import { SupabaseService } from '../../../infrastructure/auth/services/supabase.service';

@Injectable()
export class DeleteUserUseCase implements IDeleteUserUseCase {
  private readonly logger = new Logger(DeleteUserUseCase.name);

  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly supabaseService: SupabaseService,
  ) {}

  async execute(id: string, currentUserId: string): Promise<void> {
    try {
      const user = await this.userRepository.findById(id);
      if (!user) {
        throw new NotFoundException('Usuário não encontrado');
      }

      await this.userRepository.softDelete(id);

      const { error } = await this.supabaseService.deleteUser(user.supabaseId);
      if (error) {
        this.logger.warn(`Erro ao desativar usuário no Supabase: ${error.message}`);
      }

      this.logger.log(`Usuário deletado: ${user.email} por ${currentUserId}`);
    } catch (error) {
      this.logger.error('Erro ao deletar usuário', error);
      throw error;
    }
  }
}