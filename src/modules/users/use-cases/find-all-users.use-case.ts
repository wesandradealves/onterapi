import { Injectable, Logger, Inject } from '@nestjs/common';
import { IFindAllUsersUseCase } from '../../../domain/users/interfaces/use-cases/find-all-users.use-case.interface';
import { ISupabaseAuthService } from '../../../domain/auth/interfaces/services/supabase-auth.service.interface';
import { UserEntity } from '../../../infrastructure/auth/entities/user.entity';
import { ListUsersDto } from '../api/dtos/list-users.dto';
import { UserMapper } from '../../../shared/mappers/user.mapper';

@Injectable()
export class FindAllUsersUseCase implements IFindAllUsersUseCase {
  private readonly logger = new Logger(FindAllUsersUseCase.name);

  constructor(
    @Inject(ISupabaseAuthService)
    private readonly supabaseAuthService: ISupabaseAuthService,
  ) {}

  async execute(filters: ListUsersDto): Promise<{
    data: UserEntity[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
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
        filteredUsers = filteredUsers.filter((u: any) => u.user_metadata?.tenantId === filters.tenantId);
      }
      
      if (filters.isActive !== undefined) {
        filteredUsers = filteredUsers.filter((u: any) => !(u as any).banned_until === filters.isActive);
      }

      const mappedUsers = UserMapper.fromSupabaseList(filteredUsers);

      const total = mappedUsers.length;
      const totalPages = Math.ceil(total / limit);

      this.logger.log(`Listando ${mappedUsers.length} usuários de ${total} total`);

      return {
        data: mappedUsers,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      this.logger.error('Erro ao listar usuários', error);
      throw error;
    }
  }
}