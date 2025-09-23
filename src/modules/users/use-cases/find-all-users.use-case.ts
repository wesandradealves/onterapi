import { Inject, Injectable, Logger } from '@nestjs/common';
import { IFindAllUsersUseCase } from '../../../domain/users/interfaces/use-cases/find-all-users.use-case.interface';
import { IUserRepository } from '../../../domain/users/interfaces/repositories/user.repository.interface';
import { UserEntity } from '../../../infrastructure/auth/entities/user.entity';
import { ListUsersDto } from '../api/dtos/list-users.dto';
import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import { MESSAGES } from '../../../shared/constants/messages.constants';
import { Result } from '../../../shared/types/result.type';

type FindAllUsersOutput = {
  data: UserEntity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

@Injectable()
export class FindAllUsersUseCase
  extends BaseUseCase<ListUsersDto, FindAllUsersOutput>
  implements IFindAllUsersUseCase
{
  protected readonly logger = new Logger(FindAllUsersUseCase.name);

  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {
    super();
  }

  async execute(filters: ListUsersDto): Promise<Result<FindAllUsersOutput>> {
    return super.execute(filters);
  }

  protected async handle(filters: ListUsersDto): Promise<FindAllUsersOutput> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;

    const { data, total } = await this.userRepository.findAll({
      page,
      limit,
      role: filters.role,
      tenantId: filters.tenantId,
      isActive: filters.isActive,
    });

    const totalPages = Math.ceil(total / limit) || 1;

    this.logger.log(`${MESSAGES.LOGS.LISTING_USERS}: ${data.length} de ${total}`);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }
}
