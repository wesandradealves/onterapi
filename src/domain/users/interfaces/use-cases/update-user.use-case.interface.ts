import { UserEntity } from '../../../../infrastructure/auth/entities/user.entity';
import { Result } from '../../../../shared/types/result.type';
import { IUpdateUser } from '../../types/user.types';

export interface IUpdateUserUseCase {
  execute(slug: string, dto: IUpdateUser, currentUserId: string): Promise<Result<UserEntity>>;
}
