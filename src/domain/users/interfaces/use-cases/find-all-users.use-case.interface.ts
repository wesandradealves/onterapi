import { UserEntity } from '../../../../infrastructure/auth/entities/user.entity';
import { Result } from '../../../../shared/types/result.type';
import { IUserFilters } from '../../types/user.types';

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
  execute(filters: IUserFilters): Promise<Result<FindAllUsersOutput>>;
  executeOrThrow(filters: IUserFilters): Promise<FindAllUsersOutput>;
}
