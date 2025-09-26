import { UserEntity } from '../../../../infrastructure/auth/entities/user.entity';
import { Result } from '../../../../shared/types/result.type';
import { CreateUserCommand } from '../../types/user.types';

export interface ICreateUserUseCase {
  execute(dto: CreateUserCommand): Promise<Result<UserEntity>>;
}
