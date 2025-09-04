import { UserEntity } from '../../../../infrastructure/auth/entities/user.entity';
import { Result } from '../../../../shared/types/result.type';

type FindAllUsersOutput = {
  data: UserEntity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export interface IFindAllUsersUseCase {
  execute(filters: any): Promise<Result<FindAllUsersOutput>>;
}