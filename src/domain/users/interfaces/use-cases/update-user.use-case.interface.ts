import { UserEntity } from '../../../../infrastructure/auth/entities/user.entity';
import { Result } from '../../../../shared/types/result.type';

export interface IUpdateUserUseCase {
  execute(id: string, dto: any, currentUserId: string): Promise<Result<UserEntity>>;
}