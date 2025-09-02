import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { IDeleteUserUseCase } from '../../../domain/users/interfaces/use-cases/delete-user.use-case.interface';
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DeleteUserUseCase implements IDeleteUserUseCase {
  private readonly logger = new Logger(DeleteUserUseCase.name);
  private readonly supabase;

  constructor(
    private readonly configService: ConfigService,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    this.supabase = createClient(supabaseUrl!, supabaseKey!);
  }

  async execute(id: string, currentUserId: string): Promise<void> {
    try {
      const { data: user, error: fetchError } = await this.supabase.auth.admin.getUserById(id);
      
      if (fetchError || !user) {
        throw new NotFoundException('Usuário não encontrado');
      }

      const { error: deleteError } = await this.supabase.auth.admin.deleteUser(id);
      
      if (deleteError) {
        throw deleteError;
      }

      this.logger.log(`Usuário deletado: ${user.user.email} por ${currentUserId}`);
    } catch (error) {
      this.logger.error('Erro ao deletar usuário', error);
      throw error;
    }
  }
}