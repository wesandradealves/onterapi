import { UserEntity } from '../../../../infrastructure/auth/entities/user.entity';
import { Result } from '../../../../shared/types/result.type';

export interface ICreateUserUseCase {
  execute(dto: any): Promise<Result<UserEntity>>;
}