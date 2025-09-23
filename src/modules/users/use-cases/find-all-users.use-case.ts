import { Inject, Injectable, Logger } from '@nestjs/common';
import { IFindAllUsersUseCase } from '../../../domain/users/interfaces/use-cases/find-all-users.use-case.interface';
import { ISupabaseAuthService } from '../../../domain/auth/interfaces/services/supabase-auth.service.interface';
import { UserEntity } from '../../../infrastructure/auth/entities/user.entity';
import { ListUsersDto } from '../api/dtos/list-users.dto';
import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import { UserMapper } from '../../../shared/mappers/user.mapper';
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
    @Inject(ISupabaseAuthService)
    private readonly supabaseAuthService: ISupabaseAuthService,
  ) {
    super();
  }

  async execute(filters: ListUsersDto): Promise<Result<FindAllUsersOutput>> {
    return super.execute(filters);
  }

  protected async handle(filters: ListUsersDto): Promise<FindAllUsersOutput> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;

    const result = await this.supabaseAuthService.listUsers({
      page,
      perPage: limit,
    });

    if (result.error) {
      throw result.error;
    }

    let filteredUsers = result.data?.users || [];

    if (filters.role) {
      filteredUsers = filteredUsers.filter((u: any) => u.user_metadata?.role === filters.role);
    }

    if (filters.tenantId) {
      filteredUsers = filteredUsers.filter(
        (u: any) => u.user_metadata?.tenantId === filters.tenantId,
      );
    }

    if (filters.isActive !== undefined) {
      filteredUsers = filteredUsers.filter(
        (u: any) => !(u as any).banned_until === filters.isActive,
      );
    }

    const mappedUsers = UserMapper.fromSupabaseList(filteredUsers);

    const total = mappedUsers.length;
    const totalPages = Math.ceil(total / limit);

    this.logger.log(`${MESSAGES.LOGS.LISTING_USERS}: ${mappedUsers.length} de ${total} total`);

    return {
      data: mappedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }
}
