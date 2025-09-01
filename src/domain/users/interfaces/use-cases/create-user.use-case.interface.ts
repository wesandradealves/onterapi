import { UserEntity } from '../../../../infrastructure/auth/entities/user.entity';

export interface ICreateUserUseCase {
  execute(dto: any): Promise<UserEntity>;
}