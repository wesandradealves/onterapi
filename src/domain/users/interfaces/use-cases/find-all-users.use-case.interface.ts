import { UserEntity } from '../../../../infrastructure/auth/entities/user.entity';

export interface IFindAllUsersUseCase {
  execute(filters: any): Promise<{
    data: UserEntity[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>;
}