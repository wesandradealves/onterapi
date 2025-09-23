import { UserEntity } from '../../../../infrastructure/auth/entities/user.entity';
import { Result } from '../../../../shared/types/result.type';

export interface IFindUserBySlugUseCase {
  execute(slug: string): Promise<Result<UserEntity | null>>;
}

export const FindUserBySlugUseCaseToken = Symbol('IFindUserBySlugUseCase');
