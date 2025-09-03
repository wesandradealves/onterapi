import { Injectable, Logger, Inject } from '@nestjs/common';
import { IFindUserByIdUseCase } from '../../../domain/users/interfaces/use-cases/find-user-by-id.use-case.interface';
import { ISupabaseAuthService } from '../../../domain/auth/interfaces/services/supabase-auth.service.interface';
import { UserEntity } from '../../../infrastructure/auth/entities/user.entity';
import { AuthErrorFactory, AuthErrorType } from '../../../shared/factories/auth-error.factory';
import { UserMapper } from '../../../shared/mappers/user.mapper';

@Injectable()
export class FindUserByIdUseCase implements IFindUserByIdUseCase {
  private readonly logger = new Logger(FindUserByIdUseCase.name);

  constructor(
    @Inject(ISupabaseAuthService)
    private readonly supabaseAuthService: ISupabaseAuthService,
  ) {}

  async execute(id: string): Promise<UserEntity | null> {
    try {
      const userResult = await this.supabaseAuthService.getUserById(id);

      if (userResult.error || !userResult.data) {
        throw AuthErrorFactory.create(AuthErrorType.USER_NOT_FOUND, { userId: id });
      }

      const user = UserMapper.fromSupabaseToEntity(userResult.data);

      this.logger.log(`Usuário encontrado: ${user.email}`);

      return user;
    } catch (error) {
      this.logger.error('Erro ao buscar usuário', error);
      throw error;
    }
  }
}