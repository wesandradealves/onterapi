import { UserEntity } from '../../../../infrastructure/auth/entities/user.entity';
import { Result } from '../../../../shared/types/result.type';

export interface IFindUserByIdUseCase {
  execute(id: string): Promise<Result<UserEntity | null>>;
}
