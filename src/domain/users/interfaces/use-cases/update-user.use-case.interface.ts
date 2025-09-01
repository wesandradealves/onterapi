import { UserEntity } from '../../../../infrastructure/auth/entities/user.entity';

export interface IUpdateUserUseCase {
  execute(id: string, dto: any, currentUserId: string): Promise<UserEntity>;
}