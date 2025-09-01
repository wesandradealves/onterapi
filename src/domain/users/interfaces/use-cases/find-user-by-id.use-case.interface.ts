import { UserEntity } from '../../../../infrastructure/auth/entities/user.entity';

export interface IFindUserByIdUseCase {
  execute(id: string): Promise<UserEntity | null>;
}